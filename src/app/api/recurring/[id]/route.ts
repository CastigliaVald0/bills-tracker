import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

const updateSchema = z.object({
  categoryId: z.string().optional(),
  amount: z.number().positive().optional(),
  currency: z.enum(["UYU", "USD"]).optional(),
  dayOfMonth: z.number().int().min(1).max(28).optional(),
  description: z.string().max(200).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.recurringExpense.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const recurring = await prisma.recurringExpense.update({
    where: { id },
    data: parsed.data,
    include: { category: true },
  });

  return NextResponse.json(recurring);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.recurringExpense.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.recurringExpense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
