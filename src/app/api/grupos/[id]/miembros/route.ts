import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

const schema = z.object({ userId: z.string() });

/**
 * Invita a un amigo al grupo. Solo el administrador, y solo a alguien que ya
 * sea su amigo: el grupo no es una forma de llegar a desconocidos. El invitado
 * entra recién cuando acepta.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const grupo = await prisma.grupo.findFirst({ where: { id, creadorId: userId } });
  if (!grupo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (grupo.archivadoEn) return NextResponse.json({ error: "Ese grupo está archivado." }, { status: 400 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  const invitadoId = parsed.data.userId;
  if (invitadoId === userId) return NextResponse.json({ error: "Ya sos parte del grupo." }, { status: 400 });

  const amistad = await prisma.amistad.findFirst({
    where: {
      estado: "aceptada",
      OR: [
        { solicitanteId: userId, destinatarioId: invitadoId },
        { solicitanteId: invitadoId, destinatarioId: userId },
      ],
    },
  });
  if (!amistad) return NextResponse.json({ error: "Solo podés sumar a tus amigos." }, { status: 400 });

  const existente = await prisma.miembroGrupo.findUnique({
    where: { grupoId_userId: { grupoId: id, userId: invitadoId } },
  });
  if (existente) {
    return NextResponse.json(
      { error: existente.estado === "aceptado" ? "Ya está en el grupo." : "Ya está invitado." },
      { status: 409 }
    );
  }

  await prisma.miembroGrupo.create({ data: { grupoId: id, userId: invitadoId, invitadoPorId: userId } });
  return NextResponse.json({ ok: true }, { status: 201 });
}
