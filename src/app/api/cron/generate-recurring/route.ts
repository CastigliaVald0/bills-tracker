import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

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
    where: { active: true, dayOfMonth: today },
  });

  let created = 0;
  for (const template of due) {
    const alreadyGenerated = await prisma.expense.findFirst({
      where: { recurringExpenseId: template.id, date: { gte: monthStart } },
    });
    if (alreadyGenerated) continue;

    await prisma.expense.create({
      data: {
        userId: template.userId,
        categoryId: template.categoryId,
        amount: template.amount,
        currency: template.currency,
        date: now,
        description: template.description,
        recurringExpenseId: template.id,
      },
    });
    created++;
  }

  // Limpieza: tokens de recuperación vencidos y ventanas de rate limit viejas.
  // Se hace acá para que las tablas no crezcan sin control.
  const [deletedTokens, deletedLimits] = await Promise.all([
    prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.rateLimit.deleteMany({
      where: { windowStart: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
    }),
  ]);

  return NextResponse.json({
    checked: due.length,
    created,
    cleaned: { resetTokens: deletedTokens.count, rateLimits: deletedLimits.count },
  });
}
