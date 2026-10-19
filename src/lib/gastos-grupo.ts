import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { participantes } from "@/lib/grupos-db";
import { partesCierran, repartirEnPartesIguales } from "@/lib/saldos";

/**
 * Lo que comparten cargar y editar un gasto del grupo: qué datos se aceptan y
 * cómo se valida y se calcula la parte de cada uno. Viven acá para que las dos
 * rutas apliquen exactamente las mismas reglas.
 */

export const gastoGrupalSchema = z.object({
  monto: z.number().positive(),
  moneda: z.enum(["UYU", "USD"]),
  fecha: z.string(),
  descripcion: z.string().max(200).optional(),
  seccionId: z.string().nullish(),
  /** La categoría de quien carga, para su propia parte. */
  categoryId: z.string(),
  /** Quién pagó. Sin esto, quien lo carga. */
  pagadorId: z.string().optional(),
  reparto: z
    .discriminatedUnion("modo", [
      z.object({ modo: z.literal("iguales"), personas: z.array(z.string()).min(1) }),
      z.object({
        modo: z.literal("montos"),
        partes: z.array(z.object({ userId: z.string(), monto: z.number().min(0) })).min(1),
      }),
    ])
    .optional(),
});

export type DatosDeGastoGrupal = z.infer<typeof gastoGrupalSchema>;

/**
 * Valida un gasto contra el grupo (categoría, sección, quién pagó y el
 * reparto) y calcula la parte de cada uno. Devuelve el error para mostrar, o
 * lo necesario para guardarlo.
 */
export async function resolverGastoGrupal(grupoId: string, userId: string, datos: DatosDeGastoGrupal) {
  const [personas, categoria, seccion] = await Promise.all([
    participantes(grupoId),
    prisma.category.findFirst({ where: { id: datos.categoryId, userId }, select: { id: true } }),
    datos.seccionId
      ? prisma.seccionGrupo.findFirst({ where: { id: datos.seccionId, grupoId }, select: { id: true } })
      : null,
  ]);
  if (!categoria) return { error: "Categoría inválida" } as const;
  if (datos.seccionId && !seccion) return { error: "Sección inválida" } as const;

  const ids = new Set(personas.map((p) => p.id));
  const pagadorId = datos.pagadorId ?? userId;
  if (!ids.has(pagadorId)) return { error: "Quien pagó no es del grupo." } as const;

  // Cuánto le toca a cada uno. Sin reparto, todo es de quien pagó (el caso de
  // un grupo propio, sin amigos).
  let partes: Map<string, number>;
  const reparto = datos.reparto ?? { modo: "iguales" as const, personas: [pagadorId] };
  if (reparto.modo === "iguales") {
    const elegidas = [...new Set(reparto.personas)];
    if (elegidas.some((p) => !ids.has(p))) return { error: "Alguien del reparto no es del grupo." } as const;
    partes = repartirEnPartesIguales(datos.monto, elegidas, pagadorId);
  } else {
    if (reparto.partes.some((p) => !ids.has(p.userId))) {
      return { error: "Alguien del reparto no es del grupo." } as const;
    }
    if (!partesCierran(datos.monto, reparto.partes.map((p) => p.monto))) {
      return { error: "Las partes tienen que sumar el total del gasto." } as const;
    }
    partes = new Map(reparto.partes.filter((p) => p.monto > 0).map((p) => [p.userId, p.monto]));
  }

  return {
    error: null,
    categoriaId: categoria.id,
    seccionId: seccion?.id ?? null,
    pagadorId,
    partes,
  } as const;
}
