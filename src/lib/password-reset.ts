import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const RESET_TOKEN_TTL_MINUTES = 60;

/** En la base solo se guarda el hash; el token en claro solo viaja en el mail. */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashResetToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
    },
  });

  return token;
}

export type ResetTokenLookup =
  | { valid: true; userId: string; tokenId: string }
  | { valid: false };

export async function findValidResetToken(token: string): Promise<ResetTokenLookup> {
  if (!token) return { valid: false };

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
  });

  if (!record) return { valid: false };
  if (record.usedAt) return { valid: false };
  if (record.expiresAt <= new Date()) return { valid: false };

  return { valid: true, userId: record.userId, tokenId: record.id };
}

/**
 * Marca el token usado e invalida cualquier otro pendiente del mismo usuario,
 * para que un pedido viejo no siga sirviendo después de cambiar la contraseña.
 */
export async function consumeResetTokens(tokenId: string, userId: string): Promise<void> {
  const now = new Date();
  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: now },
  });
  await prisma.passwordResetToken.update({
    where: { id: tokenId },
    data: { usedAt: now },
  });
}
