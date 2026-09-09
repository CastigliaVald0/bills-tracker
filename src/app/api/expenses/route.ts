import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { rateParaGuardar } from "@/lib/exchange-rate";

const createSchema = z.object({
  categoryId: z.string(),
  amount: z.number().positive(),
  currency: z.enum(["UYU", "USD"]),
  date: z.string(),
  description: z.string().max(200).optional(),
});

function monthRange(month: string) {
  const [year, mon] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, mon - 1, 1));
  const end = new Date(Date.UTC(year, mon, 1));
  return { start, end };
}

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  const where = {
    userId,
    ...(month ? { date: { gte: monthRange(month).start, lt: monthRange(month).end } } : {}),
  };

  const expenses = await prisma.expense.findMany({
    where,
    include: { category: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(expenses);
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const category = await prisma.category.findFirst({
    where: { id: parsed.data.categoryId, userId },
  });
  if (!category) return NextResponse.json({ error: "Categoría inválida" }, { status: 400 });

  // La cotización del día queda congelada en el gasto: después el resumen la
  // usa para convertir ESTE gasto, sin importar cuánto se mueva el dólar.
  const usdRate = await rateParaGuardar(parsed.data.currency);

  const expense = await prisma.expense.create({
    data: {
      userId,
      categoryId: parsed.data.categoryId,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      date: new Date(parsed.data.date),
      description: parsed.data.description,
      usdRate,
    },
    include: { category: true },
  });

  return NextResponse.json(expense, { status: 201 });
}
