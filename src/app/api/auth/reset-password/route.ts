import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp, tooManyRequests, resetRateLimit } from "@/lib/rate-limit";
import { findValidResetToken, consumeResetTokens } from "@/lib/password-reset";

const RESET_LIMIT_PER_IP = 10;
const RESET_WINDOW_SECONDS = 15 * 60;

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = await checkRateLimit(`reset-ip:${ip}`, RESET_LIMIT_PER_IP, RESET_WINDOW_SECONDS);
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "La contraseña tiene que tener al menos 8 caracteres" },
      { status: 400 }
    );
  }

  const lookup = await findValidResetToken(parsed.data.token);
  if (!lookup.valid) {
    return NextResponse.json(
      { error: "El link no es válido o ya venció. Pedí uno nuevo." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const user = await prisma.user.update({
    where: { id: lookup.userId },
    data: { passwordHash },
  });

  await consumeResetTokens(lookup.tokenId, lookup.userId);

  // Si quedó bloqueada por intentos fallidos, se libera al recuperar la contraseña.
  await resetRateLimit(`login:${user.email}`);

  return NextResponse.json({ ok: true });
}
