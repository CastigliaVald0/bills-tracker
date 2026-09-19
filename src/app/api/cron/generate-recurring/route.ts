import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { generarGastoDelMes } from "@/lib/recurring";
import { enviarResumenesMensuales, enviarResumenesAnuales } from "@/lib/monthly-summary";

/**
 * Solo el cron puede disparar esto: genera gastos para todos los usuarios.
 * Si no hay CRON_SECRET configurado se rechaza siempre (falla cerrado), para que
 * un despliegue mal configurado no deje el endpoint abierto a cualquiera.
 */
function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const received = request.headers.get("authorization");
  if (!received) return false;

  const expectedBuf = Buffer.from(`Bearer ${secret}`);
  const receivedBuf = Buffer.from(received);
  if (expectedBuf.length !== receivedBuf.length) return false;

  return timingSafeEqual(expectedBuf, receivedBuf);
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = now.getUTCDate();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const due = await prisma.recurringExpense.findMany({
    where: {
      active: true,
      dayOfMonth: today,
      // Los que están en cuotas dejan de generarse pasado su mes final.
      // endsOn guarda el día 1 del último mes que corresponde cobrar.
      OR: [{ endsOn: null }, { endsOn: { gte: monthStart } }],
    },
  });

  let created = 0;
  for (const template of due) {
    if (await generarGastoDelMes(template, now)) created++;
  }

  // Limpieza: tokens de recuperación vencidos y ventanas de rate limit viejas.
  // Se hace acá para que las tablas no crezcan sin control.
  const [deletedTokens, deletedLimits] = await Promise.all([
    prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.rateLimit.deleteMany({
      where: { windowStart: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
    }),
  ]);

  // Avisos de fin de mes (día 1) y de fin de año (1 de enero). Los links
  // apuntan al mismo dominio por el que llegó el cron, igual que el mail de
  // recuperación.
  const url = new URL(request.url);
  let fechaDelAviso = now;
  // Solo en desarrollo: ?hoy=2026-10-01 simula otra fecha para probar el aviso
  // sin esperar a fin de mes. En producción se ignora.
  const hoySimulado = url.searchParams.get("hoy");
  if (process.env.NODE_ENV !== "production" && hoySimulado && /^\d{4}-\d{2}-\d{2}$/.test(hoySimulado)) {
    fechaDelAviso = new Date(`${hoySimulado}T12:00:00Z`);
  }
  const monthlySummary = await enviarResumenesMensuales(fechaDelAviso, url.origin);
  const annualSummary = await enviarResumenesAnuales(fechaDelAviso, url.origin);

  return NextResponse.json({
    checked: due.length,
    created,
    cleaned: { resetTokens: deletedTokens.count, rateLimits: deletedLimits.count },
    monthlySummary,
    annualSummary,
  });
}
