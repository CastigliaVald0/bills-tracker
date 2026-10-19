import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import {
  COLOR_VALIDO,
  MAXIMO_NOMBRE_GRUPO,
  MAXIMO_NOMBRE_SECCION,
  MAXIMO_SECCIONES,
  limpiarSecciones,
} from "@/lib/grupos";

const createSchema = z.object({
  nombre: z.string().trim().min(1).max(MAXIMO_NOMBRE_GRUPO),
  color: z.string().regex(COLOR_VALIDO),
  descripcion: z.string().trim().max(200).optional(),
  usaSecciones: z.boolean().default(true),
  secciones: z.array(z.string().max(MAXIMO_NOMBRE_SECCION)).max(MAXIMO_SECCIONES).default([]),
});

/** Los grupos del usuario, con sus secciones, para elegir dónde cargar un gasto. */
export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const grupos = await prisma.grupo.findMany({
    where: { creadorId: userId, archivadoEn: null },
    include: { secciones: { orderBy: { orden: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(grupos);
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Revisá los datos del grupo." }, { status: 400 });
  }
  const { nombre, color, descripcion } = parsed.data;

  // Un grupo sin secciones no guarda ninguna, aunque vengan en el pedido. Y
  // uno que pidió secciones pero no trae ninguna queda sin secciones: se
  // pueden activar después desde los ajustes del grupo.
  const secciones = parsed.data.usaSecciones ? limpiarSecciones(parsed.data.secciones) : [];
  const usaSecciones = secciones.length > 0;

  const grupo = await prisma.grupo.create({
    data: {
      creadorId: userId,
      nombre,
      color: color.toLowerCase(),
      descripcion: descripcion || null,
      usaSecciones,
      secciones: { create: secciones.map((nombreSeccion, orden) => ({ nombre: nombreSeccion, orden })) },
    },
  });

  return NextResponse.json(grupo, { status: 201 });
}
