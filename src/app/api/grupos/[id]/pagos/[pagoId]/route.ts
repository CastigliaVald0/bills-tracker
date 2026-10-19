import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

/** Deshace un pago anotado por error. Lo pueden borrar los dos que participaron. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; pagoId: string }> }
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, pagoId } = await params;
  const { count } = await prisma.pagoGrupo.deleteMany({
    where: { id: pagoId, grupoId: id, OR: [{ deId: userId }, { aId: userId }] },
  });
  if (count === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
