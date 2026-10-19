import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireUserId } from "@/lib/require-user";
import { COLOR_VALIDO, MAXIMO_NOMBRE_SECCION, limpiarSecciones } from "@/lib/grupos";
import { emojiSchema } from "@/lib/emoji";

const editarSchema = z.object({
  nombre: z.string().max(MAXIMO_NOMBRE_SECCION).optional(),
  /** null vuelve al color del grupo. */
  color: z.string().regex(COLOR_VALIDO).nullable().optional(),
  /** null lo saca. */
  emoji: emojiSchema.optional(),
});

/**
 * Cambia el nombre, el color o el emoji de una sección. Como crearlas y
 * borrarlas, lo hace solo el administrador del grupo.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; seccionId: string }> }
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, seccionId } = await params;
  const seccion = await prisma.seccionGrupo.findFirst({
    where: { id: seccionId, grupoId: id, grupo: { creadorId: userId } },
  });
  if (!seccion) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const parsed = editarSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisá los datos de la sección." }, { status: 400 });
  const datos = parsed.data;

  let nombre: string | undefined;
  if (datos.nombre !== undefined) {
    [nombre] = limpiarSecciones([datos.nombre]);
    if (!nombre) return NextResponse.json({ error: "Escribí un nombre para la sección." }, { status: 400 });
    const repetida = await prisma.seccionGrupo.findFirst({
      where: { grupoId: id, NOT: { id: seccionId }, nombre: { equals: nombre, mode: "insensitive" } },
    });
    if (repetida) return NextResponse.json({ error: "Ya hay una sección con ese nombre." }, { status: 409 });
  }

  const actualizada = await prisma.seccionGrupo.update({
    where: { id: seccionId },
    data: {
      ...(nombre !== undefined ? { nombre } : {}),
      ...(datos.color !== undefined ? { color: datos.color?.toLowerCase() ?? null } : {}),
      ...(datos.emoji !== undefined ? { emoji: datos.emoji } : {}),
    },
  });
  return NextResponse.json(actualizada);
}

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
