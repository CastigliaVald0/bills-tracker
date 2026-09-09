import type { Currency } from "@prisma/client";

/**
 * Combinar pesos y dólares en un solo número.
 *
 * Se usa SOLO en la torta "Todo junto" del resumen anual. En el resto de la app
 * las dos monedas no se suman nunca, porque sumarlas obliga a convertir y toda
 * conversión mete un supuesto.
 *
 * Cada gasto en dólares se convierte con la cotización que quedó guardada el
 * día que se cargó (`usdRate`), no con la de hoy. Así un gasto de enero se
 * valúa al dólar de enero: el pasado deja de moverse cada vez que cambia la
 * cotización.
 *
 * `cotizacionHoy` es la red de contención para los gastos que no tienen
 * cotización guardada: los cargados antes de que existiera esta columna, y
 * aquellos en los que no se pudo leer la cotización en ese momento.
 */

export type GastoConvertible = {
  amount: unknown;
  currency: Currency;
  date: Date;
  usdRate: unknown;
};

export type ResumenCombinado = {
  /** Total por mes del año, ya convertido a pesos. Índice 0 = enero. */
  porMes: number[];
  /** Cuántos gastos en dólares se convirtieron con su cotización guardada. */
  conCotizacionPropia: number;
  /** Cuántos hubo que convertir con la cotización de hoy, por no tener la suya. */
  conCotizacionDeHoy: number;
};

export function combinarPorMes(
  gastos: GastoConvertible[],
  cotizacionHoy: number
): ResumenCombinado {
  const porMes = Array.from({ length: 12 }, () => 0);
  let conCotizacionPropia = 0;
  let conCotizacionDeHoy = 0;

  for (const gasto of gastos) {
    const monto = Number(gasto.amount);
    const mes = gasto.date.getUTCMonth();

    if (gasto.currency === "UYU") {
      porMes[mes] += monto;
      continue;
    }

    // Prisma devuelve Decimal; Number() lo normaliza y descarta el 0 imposible.
    const propia = gasto.usdRate == null ? null : Number(gasto.usdRate);
    const cotizacion = propia && propia > 0 ? propia : cotizacionHoy;
    if (propia && propia > 0) conCotizacionPropia++;
    else conCotizacionDeHoy++;

    porMes[mes] += monto * cotizacion;
  }

  return { porMes, conCotizacionPropia, conCotizacionDeHoy };
}
