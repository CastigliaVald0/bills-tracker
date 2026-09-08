import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { monthInputToDate, currentMonthStart } from "@/lib/month";
import { generarGastoDelMes, diaDeCobroYaPaso } from "@/lib/recurring";

const createSchema = z.object({
  categoryId: z.string(),
  amount: z.number().positive(),
  currency: z.enum(["UYU", "USD"]),
  dayOfMonth: z.number().int().min(1).max(28),
  description: z.string().max(200).optional(),
  /** "YYYY-MM": último mes que se cobra. Sin esto, el gasto fijo no tiene fin. */
  endsOn: z.string().regex(/^\d{4}-\d{2}$/).nullish(),
});

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const recurring = await prisma.recurringExpense.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { dayOfMonth: "asc" },
  });

  return NextResponse.json(recurring);
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

  const { endsOn: endsOnInput, ...rest } = parsed.data;

  let endsOn: Date | null = null;
  if (endsOnInput) {
    endsOn = monthInputToDate(endsOnInput);
    if (!endsOn) return NextResponse.json({ error: "Mes final inválido" }, { status: 400 });
    if (endsOn < currentMonthStart()) {
      return NextResponse.json({ error: "El mes final ya pasó" }, { status: 400 });
    }
  }

  const recurring = await prisma.recurringExpense.create({
    data: { ...rest, endsOn, userId },
    include: { category: true },
  });

  // Si el día de cobro de este mes ya pasó, el cron no lo va a levantar hasta
  // el mes que viene y el gasto quedaría invisible en el mes corriente y en el
  // resumen anual. Lo generamos ahora.
  const generado = diaDeCobroYaPaso(recurring.dayOfMonth)
    ? await generarGastoDelMes(recurring)
    : false;

  return NextResponse.json({ ...recurring, generado }, { status: 201 });
}
