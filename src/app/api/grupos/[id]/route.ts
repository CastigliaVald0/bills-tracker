import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { COLOR_VALIDO, MAXIMO_NOMBRE_GRUPO } from "@/lib/grupos";

const updateSchema = z
  .object({
    nombre: z.string().trim().min(1).max(MAXIMO_NOMBRE_GRUPO).optional(),
    color: z.string().regex(COLOR_VALIDO).optional(),
    descripcion: z.string().trim().max(200).nullable().optional(),
    archivado: z.boolean().optional(),
    /** Solo se puede prender: apagarlo dejaría secciones con gastos colgando. */
    usaSecciones: z.literal(true).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No hay nada para cambiar" });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existente = await prisma.grupo.findFirst({ where: { id, creadorId: userId } });
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Revisá los datos del grupo." }, { status: 400 });
  }
  const { archivado, color, descripcion, nombre, usaSecciones } = parsed.data;

  const grupo = await prisma.grupo.update({
    where: { id },
    data: {
      ...(nombre !== undefined ? { nombre } : {}),
      ...(color !== undefined ? { color: color.toLowerCase() } : {}),
      ...(descripcion !== undefined ? { descripcion: descripcion || null } : {}),
      ...(archivado !== undefined ? { archivadoEn: archivado ? new Date() : null } : {}),
      ...(usaSecciones ? { usaSecciones: true } : {}),
    },
  });

  return NextResponse.json(grupo);
}

/**
 * Borra el grupo y sus secciones. Los gastos no se borran: quedan como gastos
 * personales comunes, porque ya forman parte de los totales de sus meses.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { count } = await prisma.grupo.deleteMany({ where: { id, creadorId: userId } });
  if (count === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
