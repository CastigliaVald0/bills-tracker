import { NextResponse, after } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import { checkRateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";
import { sendMail, newUserNotificationEmail } from "@/lib/mailer";

// Holgado a propósito: muchos usuarios móviles comparten IP (CGNAT), así que un
// límite bajo bloquearía a gente legítima. Alcanza para frenar el spam automatizado.
const REGISTER_LIMIT_PER_IP = 10;
const REGISTER_WINDOW_SECONDS = 60 * 60;

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().max(80).optional(),
});

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = await checkRateLimit(`register-ip:${ip}`, REGISTER_LIMIT_PER_IP, REGISTER_WINDOW_SECONDS);
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { password, name } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Ese email ya está registrado" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      categories: {
        create: DEFAULT_CATEGORIES,
      },
    },
  });

  // Aviso al dueño de la app. Va en after() para que la persona que se registra
  // no espere al SMTP, y cualquier falla queda en el log: el registro ya está
  // hecho y no puede romperse por un mail. En Vercel, after() mantiene viva la
  // función hasta que el envío termina, cosa que un fetch suelto no garantiza.
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
  if (adminEmail) {
    after(async () => {
      try {
        const totalUsers = await prisma.user.count();
        const mail = newUserNotificationEmail({
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          totalUsers,
        });
        await sendMail({ to: adminEmail, ...mail });
      } catch (error) {
        console.error("[register] no se pudo avisar del nuevo usuario:", error);
      }
    });
  }

  return NextResponse.json({ ok: true });
}
