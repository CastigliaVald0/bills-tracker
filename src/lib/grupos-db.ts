import { prisma } from "@/lib/prisma";
import { calcularSaldos, type MovimientoDeSaldo } from "@/lib/saldos";

/**
 * Acceso y datos compartidos de los grupos, del lado del servidor.
 *
 * Quien crea un grupo es su administrador: lo configura, maneja las secciones
 * e invita gente. Un miembro que aceptó la invitación lo ve y carga gastos.
 */

export type Rol = "admin" | "miembro";

/** El grupo y el papel del usuario en él, o null si no tiene acceso. */
export async function accesoAGrupo(userId: string, grupoId: string) {
  const grupo = await prisma.grupo.findFirst({
    where: {
      id: grupoId,
      OR: [{ creadorId: userId }, { miembros: { some: { userId, estado: "aceptado" } } }],
    },
  });
  if (!grupo) return null;
  return { grupo, rol: (grupo.creadorId === userId ? "admin" : "miembro") as Rol };
}

/** Todos los que participan del grupo: el administrador y los que aceptaron. */
export async function participantes(grupoId: string) {
  const grupo = await prisma.grupo.findUniqueOrThrow({
    where: { id: grupoId },
    select: {
      creador: { select: { id: true, name: true } },
      miembros: { where: { estado: "aceptado" }, select: { user: { select: { id: true, name: true } } } },
    },
  });
  return [grupo.creador, ...grupo.miembros.map((m) => m.user)];
}

/** Los saldos del grupo, a partir de sus gastos y pagos. */
export async function saldosDelGrupo(grupoId: string) {
  const [gastos, pagos] = await Promise.all([
    prisma.gastoGrupal.findMany({
      where: { grupoId },
      select: { pagadorId: true, moneda: true, partes: { select: { userId: true, monto: true } } },
    }),
    prisma.pagoGrupo.findMany({ where: { grupoId }, select: { deId: true, aId: true, monto: true, moneda: true } }),
  ]);

  const movimientos: MovimientoDeSaldo[] = [
    ...gastos.map((g) => ({
      tipo: "gasto" as const,
      moneda: g.moneda,
      pagadorId: g.pagadorId,
      partes: g.partes.map((p) => ({ userId: p.userId, monto: Number(p.monto) })),
    })),
    ...pagos.map((p) => ({
      tipo: "pago" as const,
      moneda: p.moneda,
      deId: p.deId,
      aId: p.aId,
      monto: Number(p.monto),
    })),
  ];
  return calcularSaldos(movimientos);
}

/** El nombre de la categoría donde caen las partes de gastos que cargó otro. */
export const CATEGORIA_GRUPAL = "Gastos grupales";

/**
 * La categoría de cada usuario para las partes que le cargan otros miembros.
 * Cada uno tiene sus propias categorías, así que quien carga el gasto no puede
 * elegir la de los demás: esa parte cae acá y el dueño la puede mover después.
 */
export async function categoriaGrupalDe(userId: string) {
  const categoria = await prisma.category.upsert({
    where: { userId_name: { userId, name: CATEGORIA_GRUPAL } },
    create: { userId, name: CATEGORIA_GRUPAL, color: "#8aa1ad", emoji: "👥" },
    update: {},
    select: { id: true },
  });
  return categoria.id;
}
