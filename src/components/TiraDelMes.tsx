import { formatMoney } from "@/lib/format";
import { CalendarioMes, type DiaDelMes } from "@/components/CalendarioMes";

export type { DiaDelMes };

/**
 * El mes en el dashboard: a la izquierda lo que se lee de un vistazo (el
 * promedio por día y cuántos días hubo gastos), a la derecha el calendario de
 * círculos, el mismo del resumen mensual.
 *
 * Reemplaza a la tira de barras, que mostraba lo mismo pero obligaba a leer
 * alturas sin referencia y a adivinar qué día era cada barra.
 */
export function TiraDelMes({
  dias,
  hoy,
  nombreMes,
  comparacion,
  huecoInicial,
}: {
  /** Un elemento por día del mes; el índice 0 es el día 1. */
  dias: DiaDelMes[];
  /** El día de hoy (1-31). */
  hoy: number;
  /** "octubre" */
  nombreMes: string;
  /** La frase que compara con el mes pasado; null si no hay con qué comparar. */
  comparacion: string | null;
  /** Cuántos lugares vacíos van antes del día 1 (0 si el mes empieza en lunes). */
  huecoInicial: number;
}) {
  const transcurridos = dias.slice(0, hoy);
  const diasConGasto = transcurridos.filter((d) => d.UYU > 0 || d.USD > 0).length;
  const pesos = transcurridos.reduce((t, d) => t + d.UYU, 0);
  const promedio = hoy > 0 ? pesos / hoy : 0;

  return (
    <section className="tarjeta aparece grid gap-6 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-8 sm:p-6">
      {/* Lo que se lee de un vistazo: el promedio y cuántos días hubo gastos. */}
      <div className="flex flex-col gap-5">
        <div className="flex items-baseline justify-between gap-3 sm:flex-col sm:items-start sm:gap-1">
          <h2 className="seccion-titulo">Tu mes, semana a semana</h2>
          <p className="text-sm text-tenue">
            Día {hoy} de {dias.length}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-1">
          <div className="rounded-2xl bg-fondo/60 px-3.5 py-3">
            <dt className="text-xs text-tenue">Promedio por día</dt>
            <dd className="monto mt-1 text-lg font-semibold text-texto">
              {formatMoney(promedio, "UYU")}
            </dd>
          </div>
          <div className="rounded-2xl bg-fondo/60 px-3.5 py-3">
            <dt className="text-xs text-tenue">Días con gastos</dt>
            <dd className="monto mt-1 text-lg font-semibold text-texto">
              {diasConGasto} <span className="text-sm font-normal text-tenue">de {hoy}</span>
            </dd>
          </div>
        </dl>

        {comparacion && <p className="text-sm leading-relaxed text-suave">{comparacion}</p>}

        <p className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-tenue">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="flex h-3.5 w-5 items-center gap-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-peso" />
              <span className="h-3 w-3 rounded-full bg-peso" />
            </span>
            Más grande, más gastaste
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-dolar" />
            Hubo dólares
          </span>
        </p>
      </div>

      <CalendarioMes dias={dias} huecoInicial={huecoInicial} hoy={hoy} nombreMes={nombreMes} />
    </section>
  );
}
