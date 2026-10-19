"use client";

import { formatMoney } from "@/lib/format";

export type DiaDelMes = { UYU: number; USD: number };

/** La semana arranca el lunes, como en los calendarios de acá. */
const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

/**
 * El mes, semana a semana. Cada día es un círculo: cuanto más grande, más se
 * gastó en pesos ese día. Al final de cada fila va lo que sumó esa semana,
 * así el número está a la vista sin tener que pasar el mouse por cada día.
 *
 * Lo usan el dashboard (solo para mirar) y el resumen mensual, donde además
 * es el filtro de la lista: con `alElegir`, cada día con gastos se puede tocar
 * para ver solo ese día, y volver a tocarlo lo suelta.
 *
 * Los dólares no se suman al círculo, como en el resto de la app: un día con
 * gastos en dólares lleva un punto verde. Los días sin gasto muestran solo su
 * número, y los que todavía no llegaron, más apagado: es lo que falta del mes.
 */
export function CalendarioMes({
  dias,
  huecoInicial,
  hoy,
  nombreMes,
  elegido = null,
  alElegir,
  destacado = null,
}: {
  /** Un elemento por día del mes; el índice 0 es el día 1. */
  dias: DiaDelMes[];
  /** Cuántos lugares vacíos van antes del día 1 (0 si el mes empieza en lunes). */
  huecoInicial: number;
  /** El día de hoy si es el mes en curso; null si el mes ya terminó. */
  hoy: number | null;
  /** "octubre" */
  nombreMes: string;
  /** El día filtrado, si hay uno. */
  elegido?: number | null;
  /** Si viene, los días con gastos se pueden tocar. */
  alElegir?: (dia: number | null) => void;
  /** El día del mayor gasto: su círculo va en el color de alerta. */
  destacado?: number | null;
}) {
  const ultimoTranscurrido = hoy ?? dias.length;
  const mayor = Math.max(...dias.map((d) => d.UYU), 0);
  const diasConGasto = dias
    .slice(0, ultimoTranscurrido)
    .filter((d) => d.UYU > 0 || d.USD > 0).length;

  // Las celdas, con huecos al principio y al final para que cada fila tenga siete.
  const celdas: (number | null)[] = [
    ...Array.from({ length: huecoInicial }, () => null),
    ...dias.map((_, i) => i + 1),
  ];
  while (celdas.length % 7 !== 0) celdas.push(null);
  const semanas: (number | null)[][] = [];
  for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7));

  return (
    <div
      role={alElegir ? "group" : "img"}
      aria-label={`Gasto de cada día de ${nombreMes}. Hubo gastos en ${diasConGasto} de ${ultimoTranscurrido} días.`}
      className="grid grid-cols-[repeat(7,minmax(0,1fr))_minmax(5.5rem,auto)] items-center gap-x-1 gap-y-1.5 sm:grid-cols-[repeat(7,2.5rem)_minmax(6.5rem,auto)]"
    >
      {DIAS_SEMANA.map((d) => (
        <span key={d} aria-hidden className="pb-1 text-center text-xs font-medium text-tenue">
          {d}
        </span>
      ))}
      <span aria-hidden className="pb-1 pl-2 text-right text-xs font-medium text-tenue">
        Semana
      </span>

      {semanas.map((semana, s) => {
        const total = { UYU: 0, USD: 0 };
        for (const n of semana) {
          if (n !== null && n <= ultimoTranscurrido) {
            total.UYU += dias[n - 1].UYU;
            total.USD += dias[n - 1].USD;
          }
        }
        const empezo = semana.some((n) => n !== null && n <= ultimoTranscurrido);
        const esEsta = hoy !== null && semana.includes(hoy);

        return [
          ...semana.map((numero, i) =>
            numero === null ? (
              <span key={`${s}-${i}`} aria-hidden />
            ) : (
              <Dia
                key={`${s}-${i}`}
                numero={numero}
                dia={dias[numero - 1]}
                mayor={mayor}
                futuro={numero > ultimoTranscurrido}
                esHoy={numero === hoy}
                nombreMes={nombreMes}
                elegido={elegido === numero}
                atenuado={elegido !== null && elegido !== numero}
                destacado={destacado === numero}
                alElegir={alElegir && (() => alElegir(elegido === numero ? null : numero))}
              />
            ),
          ),
          <span
            key={`${s}-total`}
            aria-hidden
            className={`monto flex flex-col items-end pl-2 text-right text-[13px] leading-tight ${
              esEsta ? "font-semibold text-texto" : "text-suave"
            }`}
          >
            {!empezo ? (
              <span className="text-tenue">—</span>
            ) : (
              <>
                <span>{formatMoney(total.UYU, "UYU")}</span>
                {total.USD > 0 && <span className="text-dolar">{formatMoney(total.USD, "USD")}</span>}
              </>
            )}
          </span>,
        ];
      })}
    </div>
  );
}

/**
 * Un día del calendario. El círculo crece con la raíz del monto y no en línea
 * recta: casi todos los meses tienen un día que dobla al resto —el alquiler—
 * y en escala lineal los demás quedarían como puntitos iguales entre sí.
 */
function Dia({
  numero,
  dia,
  mayor,
  futuro,
  esHoy,
  nombreMes,
  elegido,
  atenuado,
  destacado,
  alElegir,
}: {
  numero: number;
  dia: DiaDelMes;
  mayor: number;
  futuro: boolean;
  esHoy: boolean;
  nombreMes: string;
  elegido: boolean;
  atenuado: boolean;
  destacado: boolean;
  alElegir?: () => void;
}) {
  const huboGasto = dia.UYU > 0 || dia.USD > 0;
  const detalle = [dia.UYU > 0 && formatMoney(dia.UYU, "UYU"), dia.USD > 0 && formatMoney(dia.USD, "USD")]
    .filter(Boolean)
    .join(" · ");
  const descripcion = `${numero} de ${nombreMes}${
    detalle ? `: ${detalle}` : futuro ? "" : ": sin gastos"
  }${destacado ? ", el día del mayor gasto" : ""}`;
  const proporcion = mayor > 0 ? Math.sqrt(dia.UYU / mayor) : 0;
  // Nunca baja de la mitad de la celda: el número del día tiene que entrar, y
  // al lado de un día caro uno barato tiene que seguir viéndose como "hubo gasto".
  const tamano = `${52 + proporcion * 44}%`;

  // El número siempre está: en el resumen mensual el calendario es un filtro
  // y hay que saber qué día se está tocando. Lo que cambia es el fondo: un
  // círculo si hubo pesos, nada si no hubo gasto, y más apagado si el día
  // todavía no llegó.
  const contenido = (
    <>
      {!futuro && dia.UYU > 0 ? (
        <span
          className={`burbuja monto flex items-center justify-center rounded-full text-[11px] font-semibold text-fondo transition-colors ${
            destacado ? "bg-alerta" : "bg-peso"
          }`}
          // `--dia` escalona la entrada: los círculos brotan en orden, del 1 al último.
          style={{ width: tamano, height: tamano, "--dia": numero } as React.CSSProperties}
        >
          {numero}
        </span>
      ) : (
        <span className={`monto text-xs ${futuro ? "text-tenue/50" : "text-tenue"}`}>{numero}</span>
      )}
      {dia.USD > 0 && !futuro && (
        <span className="absolute top-0 right-0 h-1.5 w-1.5 rounded-full bg-dolar ring-2 ring-superficie" />
      )}
    </>
  );

  const clases = `relative flex aspect-square items-center justify-center rounded-full transition-[opacity,background-color,box-shadow] ${
    esHoy && !elegido ? "ring-1 ring-texto/70 ring-offset-2 ring-offset-superficie" : ""
  } ${elegido ? "bg-superficie-alta ring-2 ring-texto" : ""} ${atenuado ? "opacity-40" : ""}`;

  if (alElegir && huboGasto) {
    return (
      <button
        type="button"
        onClick={alElegir}
        aria-pressed={elegido}
        aria-label={descripcion}
        title={descripcion}
        className={`${clases} cursor-pointer hover:bg-superficie-alta`}
      >
        {contenido}
      </button>
    );
  }

  return (
    <span title={descripcion} aria-label={alElegir ? descripcion : undefined} className={clases}>
      {contenido}
    </span>
  );
}
