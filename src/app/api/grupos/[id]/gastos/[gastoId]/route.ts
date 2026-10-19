import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { rateParaGuardar } from "@/lib/exchange-rate";
import { accesoAGrupo, categoriaGrupalDe } from "@/lib/grupos-db";
import { gastoGrupalSchema, resolverGastoGrupal } from "@/lib/gastos-grupo";

/**
 * Edita un gasto del grupo: lo que pasó (monto, fecha, quién pagó, sección) y
 * cómo se reparte. Lo puede editar quien lo cargó o el administrador, igual
 * que borrarlo.
 *
 * El gasto que cae en el mes de cada uno se actualiza en el lugar en vez de
 * borrarse y crearse de nuevo: así cada persona conserva la categoría a la
 * que había movido su parte. Quien queda afuera del reparto pierde su gasto;
 * quien entra, lo recibe en su categoría de gastos grupales (o, si es quien
 * edita, en la categoría que eligió).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; gastoId: string }> }
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, gastoId } = await params;
  const acceso = await accesoAGrupo(userId, id);
  if (!acceso) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (acceso.grupo.archivadoEn) {
    return NextResponse.json({ error: "Ese grupo está archivado." }, { status: 400 });
  }

  const gasto = await prisma.gastoGrupal.findFirst({
    where: { id: gastoId, grupoId: id },
    include: { gastos: { select: { id: true, userId: true } } },
  });
  if (!gasto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (gasto.cargadoPorId !== userId && acceso.rol !== "admin") {
    return NextResponse.json({ error: "Solo lo puede editar quien lo cargó." }, { status: 403 });
  }

  const parsed = gastoGrupalSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Revisá los datos del gasto." }, { status: 400 });
  }
  const datos = parsed.data;

  const resuelto = await resolverGastoGrupal(id, userId, datos);
  if (resuelto.error !== null) return NextResponse.json({ error: resuelto.error }, { status: 400 });
  const { pagadorId, partes, seccionId } = resuelto;

  // La cotización es la del día en que se cargó: solo cambia si cambia la moneda.
  const usdRate = datos.moneda === gasto.moneda ? gasto.usdRate : await rateParaGuardar(datos.moneda);
  const fecha = new Date(datos.fecha);
  const descripcion = datos.descripcion || null;

  const existentes = new Map(gasto.gastos.map((g) => [g.userId, g.id]));
  // La categoría de los que entran nuevos al reparto.
  const categoriasNuevas = new Map<string, string>();
  for (const persona of partes.keys()) {
    if (existentes.has(persona) || persona === userId) continue;
    categoriasNuevas.set(persona, await categoriaGrupalDe(persona));
  }

  await prisma.$transaction(async (tx) => {
    await tx.gastoGrupal.update({
      where: { id: gastoId },
      data: { seccionId, pagadorId, monto: datos.monto, moneda: datos.moneda, fecha, descripcion, usdRate },
    });

    await tx.parteGasto.deleteMany({ where: { gastoGrupalId: gastoId } });
    await tx.parteGasto.createMany({
      data: [...partes].map(([persona, monto]) => ({ gastoGrupalId: gastoId, userId: persona, monto })),
    });

    const comunes = { currency: datos.moneda, date: fecha, description: descripcion, usdRate, seccionId };
    for (const [persona, monto] of partes) {
      const existente = existentes.get(persona);
      if (existente) {
        await tx.expense.update({
          where: { id: existente },
          data: {
            ...comunes,
            amount: monto,
            // La categoría solo la puede cambiar su dueño.
            ...(persona === userId ? { categoryId: resuelto.categoriaId } : {}),
          },
        });
      } else {
        await tx.expense.create({
          data: {
            ...comunes,
            userId: persona,
            amount: monto,
            categoryId: persona === userId ? resuelto.categoriaId : categoriasNuevas.get(persona)!,
            grupoId: id,
            gastoGrupalId: gastoId,
          },
        });
      }
    }

    const quedanAfuera = [...existentes].filter(([persona]) => !partes.has(persona)).map(([, gid]) => gid);
    if (quedanAfuera.length > 0) await tx.expense.deleteMany({ where: { id: { in: quedanAfuera } } });
  });

  return NextResponse.json({ ok: true });
}

/**
 * Borra un gasto del grupo y, con él, la parte que sumaba en el mes de cada
 * uno. Lo puede borrar quien lo cargó o el administrador del grupo.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; gastoId: string }> }
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, gastoId } = await params;
  const acceso = await accesoAGrupo(userId, id);
  if (!acceso) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const gasto = await prisma.gastoGrupal.findFirst({ where: { id: gastoId, grupoId: id } });
  if (!gasto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (gasto.cargadoPorId !== userId && acceso.rol !== "admin") {
    return NextResponse.json({ error: "Solo lo puede borrar quien lo cargó." }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.expense.deleteMany({ where: { gastoGrupalId: gastoId } }),
    prisma.gastoGrupal.delete({ where: { id: gastoId } }),
  ]);

  return NextResponse.json({ ok: true });
}
