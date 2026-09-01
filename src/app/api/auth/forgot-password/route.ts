import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";
import { createResetToken, RESET_TOKEN_TTL_MINUTES } from "@/lib/password-reset";
import { sendMail, passwordResetEmail } from "@/lib/mailer";

const FORGOT_LIMIT_PER_IP = 5;
const FORGOT_LIMIT_PER_EMAIL = 3;
const FORGOT_WINDOW_SECONDS = 60 * 60;

const forgotSchema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const ip = clientIp(request);
  const ipLimit = await checkRateLimit(`forgot-ip:${ip}`, FORGOT_LIMIT_PER_IP, FORGOT_WINDOW_SECONDS);
  if (!ipLimit.allowed) return tooManyRequests(ipLimit.retryAfterSeconds);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  const parsed = forgotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ingresá un email válido" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();

  const emailLimit = await checkRateLimit(
    `forgot-email:${email}`,
    FORGOT_LIMIT_PER_EMAIL,
    FORGOT_WINDOW_SECONDS
  );
  if (!emailLimit.allowed) return tooManyRequests(emailLimit.retryAfterSeconds);

  const user = await prisma.user.findUnique({ where: { email } });

  // Se responde siempre lo mismo, exista o no la cuenta: si no, esta ruta serviría
  // para averiguar qué emails están registrados.
  if (user) {
    const token = await createResetToken(user.id);
    const origin = new URL(request.url).origin;
    const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
    const { text, html } = passwordResetEmail(resetUrl, RESET_TOKEN_TTL_MINUTES);

    await sendMail({
      to: user.email,
      subject: "Restablecer tu contraseña - Billions Tracker",
      text,
      html,
    });
  }

  return NextResponse.json({ ok: true });
}
