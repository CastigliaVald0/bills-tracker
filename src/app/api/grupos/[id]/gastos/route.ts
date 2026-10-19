import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { rateParaGuardar } from "@/lib/exchange-rate";
import { accesoAGrupo, categoriaGrupalDe } from "@/lib/grupos-db";
import { gastoGrupalSchema, resolverGastoGrupal } from "@/lib/gastos-grupo";

/**
 * Carga un gasto en el grupo. Se guarda el gasto tal como pasó (quién pagó y
 * cuánto) y, por cada persona que le toca una parte, un gasto personal por esa
 * parte: eso es lo que suma en el mes de cada uno.
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

  const parsed = gastoGrupalSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Revisá los datos del gasto." }, { status: 400 });
  }
  const datos = parsed.data;

  const resuelto = await resolverGastoGrupal(id, userId, datos);
  if (resuelto.error !== null) return NextResponse.json({ error: resuelto.error }, { status: 400 });
  const { pagadorId, partes, seccionId } = resuelto;

  const usdRate = await rateParaGuardar(datos.moneda);
  const fecha = new Date(datos.fecha);

  // La categoría de cada parte: la elegida para la propia, la de gastos
  // grupales para las de los demás.
  const categorias = new Map<string, string>();
  for (const persona of partes.keys()) {
    categorias.set(persona, persona === userId ? resuelto.categoriaId : await categoriaGrupalDe(persona));
  }

  const gasto = await prisma.$transaction(async (tx) => {
    const creado = await tx.gastoGrupal.create({
      data: {
        grupoId: id,
        seccionId,
        pagadorId,
        cargadoPorId: userId,
        monto: datos.monto,
        moneda: datos.moneda,
        fecha,
        descripcion: datos.descripcion || null,
        usdRate,
        partes: { create: [...partes].map(([persona, monto]) => ({ userId: persona, monto })) },
      },
    });

    await tx.expense.createMany({
      data: [...partes].map(([persona, monto]) => ({
        userId: persona,
        categoryId: categorias.get(persona)!,
        amount: monto,
        currency: datos.moneda,
        date: fecha,
        description: datos.descripcion || null,
        usdRate,
        grupoId: id,
        seccionId,
        gastoGrupalId: creado.id,
      })),
    });

    return creado;
  });

  return NextResponse.json({ id: gasto.id }, { status: 201 });
}
