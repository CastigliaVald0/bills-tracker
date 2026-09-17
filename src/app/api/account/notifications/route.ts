import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { isMailerConfigured } from "@/lib/mailer";
import { isPushConfigured } from "@/lib/push";

/** Preferencias del aviso de fin de mes del usuario logueado. */
export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, notifyMonthlyEmail: true, notifyMonthlyPush: true },
  });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pushConfigured = isPushConfigured();

  return NextResponse.json({
    email: user.email,
    monthlyEmail: user.notifyMonthlyEmail,
    monthlyPush: user.notifyMonthlyPush,
    mailConfigured: isMailerConfigured(),
    pushConfigured,
    // La clave pública VAPID es pública por diseño: el navegador la necesita para
    // suscribirse. Se entrega en tiempo de ejecución para no depender del build.
    vapidPublicKey: pushConfigured ? process.env.VAPID_PUBLIC_KEY : null,
  });
}

const patchSchema = z
  .object({
    monthlyEmail: z.boolean().optional(),
    monthlyPush: z.boolean().optional(),
  })
  .refine((d) => d.monthlyEmail !== undefined || d.monthlyPush !== undefined, {
    message: "No hay nada para cambiar",
  });

export async function PATCH(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { monthlyEmail, monthlyPush } = parsed.data;

  if (monthlyEmail === true && !isMailerConfigured()) {
    return NextResponse.json({ error: "El envío de mails no está configurado" }, { status: 400 });
  }
  if (monthlyPush === true && !isPushConfigured()) {
    return NextResponse.json({ error: "Las notificaciones no están configuradas" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(monthlyEmail !== undefined ? { notifyMonthlyEmail: monthlyEmail } : {}),
      ...(monthlyPush !== undefined ? { notifyMonthlyPush: monthlyPush } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
