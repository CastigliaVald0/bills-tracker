import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { COLOR_VALIDO, MAXIMO_NOMBRE_SECCION, MAXIMO_SECCIONES, limpiarSecciones } from "@/lib/grupos";
import { emojiSchema } from "@/lib/emoji";

const createSchema = z.object({
  nombre: z.string().max(MAXIMO_NOMBRE_SECCION),
  /** Sin color, la sección usa el del grupo. */
  color: z.string().regex(COLOR_VALIDO).nullish(),
  emoji: emojiSchema.optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const grupo = await prisma.grupo.findFirst({
    where: { id, creadorId: userId },
    include: { secciones: { select: { nombre: true, orden: true } } },
  });
  if (!grupo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  const [nombre] = parsed.success ? limpiarSecciones([parsed.data.nombre]) : [];
  if (!nombre) return NextResponse.json({ error: "Escribí un nombre para la sección." }, { status: 400 });

  if (grupo.secciones.length >= MAXIMO_SECCIONES) {
    return NextResponse.json({ error: "Llegaste al máximo de secciones de un grupo." }, { status: 400 });
  }
  if (grupo.secciones.some((s) => s.nombre.toLowerCase() === nombre.toLowerCase())) {
    return NextResponse.json({ error: "Ya hay una sección con ese nombre." }, { status: 409 });
  }

  const orden = Math.max(-1, ...grupo.secciones.map((s) => s.orden)) + 1;
  const seccion = await prisma.seccionGrupo.create({
    data: {
      grupoId: id,
      nombre,
      orden,
      color: parsed.success ? (parsed.data.color?.toLowerCase() ?? null) : null,
      emoji: parsed.success ? (parsed.data.emoji ?? null) : null,
    },
  });

  return NextResponse.json(seccion, { status: 201 });
}
