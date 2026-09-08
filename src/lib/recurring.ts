import type { RecurringExpense } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { diaDeCobroYaPaso } from "@/lib/month";

export { diaDeCobroYaPaso };

/**
 * Crea la instancia del mes corriente de un gasto fijo.
 *
 * Es idempotente: si el gasto de este mes ya existe no hace nada, así que la
 * pueden llamar tanto el cron diario como el alta de un gasto fijo sin
 * duplicar nada. Devuelve true solo si creó el gasto.
 */
export async function generarGastoDelMes(
  template: RecurringExpense,
  now = new Date()
): Promise<boolean> {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const monthStart = new Date(Date.UTC(year, month, 1));

  if (!template.active) return false;

  // Un gasto en cuotas que ya terminó no genera más nada.
  if (template.endsOn && template.endsOn < monthStart) return false;

  const yaExiste = await prisma.expense.findFirst({
    where: { recurringExpenseId: template.id, date: { gte: monthStart } },
  });
  if (yaExiste) return false;

  await prisma.expense.create({
    data: {
      userId: template.userId,
      categoryId: template.categoryId,
      amount: template.amount,
      currency: template.currency,
      // El día real del cobro, no la hora en que se ejecutó el cron.
      date: new Date(Date.UTC(year, month, template.dayOfMonth)),
      description: template.description,
      recurringExpenseId: template.id,
    },
  });

  return true;
}
