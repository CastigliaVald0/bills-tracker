import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

/**
 * Borra una sección. Sus gastos siguen en el grupo, sin sección: la sección es
 * solo una etiqueta, borrarla no puede llevarse plata ya registrada.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; seccionId: string }> }
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, seccionId } = await params;
  // El filtro por creador va en la misma consulta: nadie borra secciones ajenas.
  const { count } = await prisma.seccionGrupo.deleteMany({
    where: { id: seccionId, grupoId: id, grupo: { creadorId: userId } },
  });
  if (count === 0) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
