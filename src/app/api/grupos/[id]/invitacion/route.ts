import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

const schema = z.object({ accion: z.enum(["aceptar", "rechazar"]) });

/** El invitado responde: acepta y entra al grupo, o rechaza y la invitación se borra. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });

  const { id } = await params;
  const invitacion = await prisma.miembroGrupo.findFirst({
    where: { grupoId: id, userId, estado: "pendiente" },
  });
  if (!invitacion) return NextResponse.json({ error: "No hay una invitación pendiente." }, { status: 404 });

  if (parsed.data.accion === "aceptar") {
    await prisma.miembroGrupo.update({
      where: { id: invitacion.id },
      data: { estado: "aceptado", respondidoEn: new Date() },
    });
  } else {
    await prisma.miembroGrupo.delete({ where: { id: invitacion.id } });
  }
  return NextResponse.json({ ok: true });
}
