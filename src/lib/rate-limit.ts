import { prisma } from "@/lib/prisma";

/**
 * Límite de intentos con ventana fija, guardado en la base.
 *
 * Se usa la base y no memoria porque en producción (Vercel) cada request puede caer
 * en una instancia distinta: un contador en memoria no serviría de nada.
 */

export type RateLimitResult = {
  allowed: boolean;
  /** Segundos que faltan para que se libere la ventana. */
  retryAfterSeconds: number;
};

const ALLOWED: RateLimitResult = { allowed: true, retryAfterSeconds: 0 };

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStartCutoff = new Date(now.getTime() - windowSeconds * 1000);

  try {
    const existing = await prisma.rateLimit.findUnique({ where: { key } });

    // Sin registro previo, o la ventana anterior ya venció: arranca una nueva.
    if (!existing || existing.windowStart <= windowStartCutoff) {
      await prisma.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, windowStart: now },
        update: { count: 1, windowStart: now },
      });
      return ALLOWED;
    }

    if (existing.count >= limit) {
      const elapsedMs = now.getTime() - existing.windowStart.getTime();
      const retryAfterSeconds = Math.max(1, Math.ceil(windowSeconds - elapsedMs / 1000));
      return { allowed: false, retryAfterSeconds };
    }

    await prisma.rateLimit.update({
      where: { key },
      data: { count: { increment: 1 } },
    });
    return ALLOWED;
  } catch {
    // Si la base falla, no bloqueamos al usuario legítimo: el resto de la request
    // igual va a fallar por su cuenta si el problema es real.
    return ALLOWED;
  }
}

/** Descuenta un intento (se usa cuando el intento resultó exitoso). */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    await prisma.rateLimit.deleteMany({ where: { key } });
  } catch {
    // No es crítico: la ventana vence sola.
  }
}

/** IP del cliente detrás del proxy de Vercel. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "desconocida";
}

export function tooManyRequests(retryAfterSeconds: number) {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return Response.json(
    { error: `Demasiados intentos. Probá de nuevo en ${minutes} minuto${minutes === 1 ? "" : "s"}.` },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}
