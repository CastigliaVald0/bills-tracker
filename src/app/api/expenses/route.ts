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
  /** Si el gasto se carga dentro de un grupo, y en qué sección. */
  grupoId: z.string().optional(),
  seccionId: z.string().nullish(),
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
    include: { category: true, grupo: { select: { id: true, nombre: true, color: true } } },
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

  // Un gasto de grupo sigue siendo un gasto personal: lo único que cambia es
  // que queda anotado a qué grupo y sección pertenece. Los dos tienen que ser
  // del usuario, y la sección tiene que ser de ese grupo.
  let grupoId: string | null = null;
  let seccionId: string | null = null;
  if (parsed.data.grupoId) {
    const grupo = await prisma.grupo.findFirst({
      where: { id: parsed.data.grupoId, creadorId: userId },
      select: { id: true, archivadoEn: true, secciones: { select: { id: true } } },
    });
    if (!grupo) return NextResponse.json({ error: "Grupo inválido" }, { status: 400 });
    if (grupo.archivadoEn) {
      return NextResponse.json({ error: "Ese grupo está archivado." }, { status: 400 });
    }
    grupoId = grupo.id;
    if (parsed.data.seccionId) {
      if (!grupo.secciones.some((s) => s.id === parsed.data.seccionId)) {
        return NextResponse.json({ error: "Sección inválida" }, { status: 400 });
      }
      seccionId = parsed.data.seccionId;
    }
  }

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
      grupoId,
      seccionId,
    },
    include: { category: true },
  });

  return NextResponse.json(expense, { status: 201 });
}
