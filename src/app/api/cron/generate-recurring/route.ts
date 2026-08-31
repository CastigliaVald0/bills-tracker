import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

  return NextResponse.json({ checked: due.length, created });
}
