import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { accesoAGrupo, participantes } from "@/lib/grupos-db";

const schema = z.object({
  monto: z.number().positive().max(9_999_999_999),
  /** Quién puso la plata. Sin esto, quien lo anota. */
  userId: z.string().optional(),
  fecha: z.string().optional(),
});

/**
 * Anota un aporte para la meta de ahorro del grupo. Lo puede anotar cualquier
 * integrante, para sí o para otro (como quién pagó un gasto). No es un gasto:
 * no suma en el mes de nadie ni cambia los saldos.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const acceso = await accesoAGrupo(userId, id);
  if (!acceso) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (acceso.grupo.archivadoEn) {
    return NextResponse.json({ error: "Ese grupo está archivado." }, { status: 400 });
  }
  if (acceso.grupo.metaMonto === null) {
    return NextResponse.json({ error: "Este grupo no tiene una meta." }, { status: 400 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisá el monto del aporte." }, { status: 400 });
  const datos = parsed.data;

  const aportante = datos.userId ?? userId;
  const personas = await participantes(id);
  if (!personas.some((p) => p.id === aportante)) {
    return NextResponse.json({ error: "Esa persona no es del grupo." }, { status: 400 });
  }

  const aporte = await prisma.aporteMeta.create({
    data: {
      grupoId: id,
      userId: aportante,
      monto: datos.monto,
      // Siempre en la moneda de la meta.
      moneda: acceso.grupo.metaMoneda,
      fecha: datos.fecha ? new Date(datos.fecha) : new Date(),
      registradoPorId: userId,
    },
  });
  return NextResponse.json({ id: aporte.id }, { status: 201 });
}
