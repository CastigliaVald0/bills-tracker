import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

/** Si aparecés o no en la búsqueda por nombre de otras personas. */
export async function PATCH(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = z
    .object({ buscablePorNombre: z.boolean() })
    .safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  await prisma.user.update({
    where: { id: userId },
    data: { buscablePorNombre: parsed.data.buscablePorNombre },
  });

  return NextResponse.json({ ok: true });
}
