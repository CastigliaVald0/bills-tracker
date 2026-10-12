import { formatMoney } from "@/lib/format";

export type DiaDelMes = { UYU: number; USD: number };

/**
 * El mes, día por día: una columna por cada día, tan alta como lo gastado en
 * pesos ese día. Es el pulso del mes de un vistazo: cuánto va, qué días
 * pesaron y cuánto falta.
 *
 * Los dólares no se suman a la barra, como en el resto de la app: un día con
 * gastos en dólares lleva un punto verde arriba. Los días que todavía no
 * llegaron quedan como marcas apagadas en la base.
 */
export function TiraDelMes({
  dias,
  hoy,
  nombreMes,
  comparacion,
}: {
  /** Un elemento por día del mes; el índice 0 es el día 1. */
  dias: DiaDelMes[];
  /** El día de hoy (1-31). */
  hoy: number;
  /** "octubre" */
  nombreMes: string;
  /** La frase que compara con el mes pasado; null si no hay con qué comparar. */
  comparacion: string | null;
}) {
  const mayor = Math.max(...dias.map((d) => d.UYU), 0);
  const diasConGasto = dias.filter((d, i) => i < hoy && (d.UYU > 0 || d.USD > 0)).length;

  return (
    <section className="tarjeta aparece px-4 pt-4 pb-3.5 sm:px-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="rotulo">El mes, día por día</h2>
        <p className="monto text-xs text-suave">
          Día {hoy} de {dias.length}
        </p>
      </div>

      <div
        role="img"
        aria-label={`Gasto de cada día de ${nombreMes}. Gastaste en ${diasConGasto} de los ${hoy} días que van del mes.`}
        className="mt-4 flex h-24 items-stretch gap-[2px] sm:gap-1"
      >
        {dias.map((dia, i) => {
          const numero = i + 1;
          const esHoy = numero === hoy;
          const futuro = numero > hoy;
          const altura = mayor > 0 ? (dia.UYU / mayor) * 100 : 0;
          const detalle = [
            dia.UYU > 0 && formatMoney(dia.UYU, "UYU"),
            dia.USD > 0 && formatMoney(dia.USD, "USD"),
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <div
              key={numero}
              title={`${numero} de ${nombreMes}${detalle ? `: ${detalle}` : futuro ? "" : ": sin gastos"}`}
              className={`flex min-w-0 flex-1 flex-col justify-end rounded-[3px] ${
                esHoy ? "bg-superficie-alta" : ""
              }`}
            >
              {/* el punto de los dólares, apoyado sobre la barra */}
              {dia.USD > 0 && (
                <span className="mx-auto mb-1 h-1.5 w-1.5 shrink-0 rounded-full bg-dolar" />
              )}
              <span
                className={`block w-full rounded-[2px] ${
                  dia.UYU > 0 ? "bg-peso" : futuro ? "bg-borde" : "bg-borde-fuerte"
                }`}
                // Un día con gasto nunca baja de 3px: si no, al lado de un día
                // caro desaparecería.
                style={{ height: dia.UYU > 0 ? `max(3px, ${altura}%)` : "2px" }}
              />
            </div>
          );
        })}
      </div>

      {/* La regla: el primero de cada semana, y hoy en lugar de su número. */}
      <div aria-hidden className="mt-1.5 flex gap-[2px] sm:gap-1">
        {dias.map((_, i) => {
          const numero = i + 1;
          const esHoy = numero === hoy;
          const marca = numero % 7 === 1;
          // Si hoy cae al lado de una marca, la marca se calla para no pisarse.
          const tapada = Math.abs(numero - hoy) === 1 && marca;
          return (
            <span
              key={numero}
              className={`monto flex min-w-0 flex-1 justify-center text-[9px] leading-none whitespace-nowrap ${
                esHoy ? "font-medium text-texto" : "text-tenue"
              }`}
            >
              {esHoy ? "hoy" : marca && !tapada ? numero : ""}
            </span>
          );
        })}
      </div>

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-borde pt-3">
        <p className="text-sm text-suave">
          {comparacion ?? `Gastaste en ${diasConGasto} de los ${hoy} días que van del mes.`}
        </p>
        <p className="flex items-center gap-3 text-xs text-tenue">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 rounded-[2px] bg-peso" />
            Pesos
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-dolar" />
            Hubo dólares
          </span>
        </p>
      </div>
    </section>
  );
}
