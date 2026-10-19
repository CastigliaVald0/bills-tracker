import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { saldosDelGrupo } from "@/lib/grupos-db";
import { estaSaldado } from "@/lib/saldos";

/**
 * Saca a alguien del grupo. El administrador puede sacar a cualquiera (o
 * cancelar una invitación); cada miembro puede irse solo. Nadie sale con
 * plata pendiente: primero hay que saldar.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, userId: otroId } = await params;
  const grupo = await prisma.grupo.findUnique({ where: { id } });
  if (!grupo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const esAdmin = grupo.creadorId === userId;
  if (!esAdmin && otroId !== userId) {
    return NextResponse.json({ error: "Solo el administrador puede sacar a alguien." }, { status: 403 });
  }

  const miembro = await prisma.miembroGrupo.findUnique({
    where: { grupoId_userId: { grupoId: id, userId: otroId } },
  });
  if (!miembro) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (miembro.estado === "aceptado" && !estaSaldado(await saldosDelGrupo(id), otroId)) {
    return NextResponse.json(
      { error: "Tiene plata pendiente en el grupo. Primero hay que saldar." },
      { status: 400 }
    );
  }

  await prisma.miembroGrupo.delete({ where: { id: miembro.id } });
  return NextResponse.json({ ok: true });
}
