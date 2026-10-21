import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { accesoAGrupo } from "@/lib/grupos-db";

/** Borra un aporte. Lo puede borrar quien lo anotó o el administrador. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; aporteId: string }> }
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, aporteId } = await params;
  const acceso = await accesoAGrupo(userId, id);
  if (!acceso) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const aporte = await prisma.aporteMeta.findFirst({ where: { id: aporteId, grupoId: id } });
  if (!aporte) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (aporte.registradoPorId !== userId && acceso.rol !== "admin") {
    return NextResponse.json({ error: "Solo lo puede borrar quien lo anotó." }, { status: 403 });
  }

  await prisma.aporteMeta.delete({ where: { id: aporteId } });
  return NextResponse.json({ ok: true });
}
