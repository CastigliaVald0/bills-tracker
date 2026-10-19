import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { accesoAGrupo, participantes } from "@/lib/grupos-db";

const schema = z.object({
  deId: z.string(),
  aId: z.string(),
  monto: z.number().positive(),
  moneda: z.enum(["UYU", "USD"]),
});

/**
 * Registra que un miembro le devolvió plata a otro. Lo puede anotar cualquiera
 * de los dos, el que pagó o el que cobró, y no hace falta que el otro lo
 * confirme.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const acceso = await accesoAGrupo(userId, id);
  if (!acceso) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisá el pago." }, { status: 400 });
  const { deId, aId, monto, moneda } = parsed.data;

  if (deId === aId) return NextResponse.json({ error: "Un pago es entre dos personas." }, { status: 400 });
  if (userId !== deId && userId !== aId) {
    return NextResponse.json({ error: "Solo lo puede anotar quien pagó o quien cobró." }, { status: 403 });
  }
  const ids = new Set((await participantes(id)).map((p) => p.id));
  if (!ids.has(deId) || !ids.has(aId)) {
    return NextResponse.json({ error: "Los dos tienen que ser del grupo." }, { status: 400 });
  }

  await prisma.pagoGrupo.create({
    data: { grupoId: id, deId, aId, monto, moneda, fecha: new Date(), registradoPorId: userId },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
