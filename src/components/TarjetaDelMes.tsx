import Link from "next/link";
import { formatMoney } from "@/lib/format";
import type { DiaDelMes } from "@/components/CalendarioMes";

export type { DiaDelMes };

/** Aire arriba del gráfico (en % del alto), para que la punta no toque el borde. */
const AIRE = 8;

/**
 * La tarjeta del mes en el dashboard: cómo viene el mes y cómo va a cerrar,
 * de un vistazo. Es lo único de la app en azul pizarra (ver .tarjeta-mes): se
 * despega de las tarjetas grises sin pisar los colores que ya significan
 * algo (celeste pesos, verde dólares, rojo alerta).
 *
 * Su firma es la curva del mes: lo gastado acumulado día a día, que sube un
 * escalón con cada día de gastos (cada uno, un punto). De fondo, tenue, la
 * del mes pasado; desde hoy, punteada, hasta dónde llega a este ritmo. Así
 * se ve de un vistazo si se va por arriba o por debajo y cómo se cierra.
 * Todo en pesos: es la moneda del día a día y las dos no se suman.
 */
export function TarjetaDelMes({
  dias,
  hoy,
  nombreMes,
  comparacion,
  anterior,
  pendientes,
}: {
  /** Un elemento por día del mes; el índice 0 es el día 1. */
  dias: DiaDelMes[];
  /** El día de hoy (1-31). */
  hoy: number;
  /** "octubre" */
  nombreMes: string;
  /** Contra el mes pasado hasta el mismo día; null si no hay con qué comparar. */
  comparacion: { diferencia: number; mes: string } | null;
  /** Los pesos de cada día del mes pasado (índice 0 = día 1); null si no hubo. */
  anterior: number[] | null;
  /** Lo que falta de los gastos fijos en pesos este mes. */
  pendientes: number;
}) {
  const transcurridos = dias.slice(0, hoy);
  const pesos = transcurridos.reduce((t, d) => t + d.UYU, 0);
  const promedio = hoy > 0 ? pesos / hoy : 0;
  const diasConGasto = transcurridos.filter((d) => d.UYU > 0 || d.USD > 0).length;
  // Con pocos días, el ritmo todavía no dice nada.
  const temprano = hoy < 5;
  const mes = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

  const proyeccion = promedio * dias.length;

  // Las curvas, en % del ancho (fracción del mes) y del alto. Las dos arrancan
  // en cero el día 0; el mes pasado se estira a su propio largo, así un mes
  // de 30 y uno de 31 terminan en el mismo lugar.
  const acumulado: number[] = [];
  transcurridos.reduce((t, d) => (acumulado.push(t + d.UYU), t + d.UYU), 0);
  const acumuladoAnterior: number[] = [];
  anterior?.reduce((t, v) => (acumuladoAnterior.push(t + v), t + v), 0);
  const techo = Math.max(temprano ? pesos : proyeccion, acumuladoAnterior.at(-1) ?? 0, pesos, 1);
  const y = (monto: number) => 100 - (monto / techo) * (100 - AIRE);
  const linea = (montos: number[], largo: number) =>
    `M0 100 ${montos.map((m, i) => `L${(((i + 1) / largo) * 100).toFixed(2)} ${y(m).toFixed(2)}`).join(" ")}`;

  const xHoy = (hoy / dias.length) * 100;
  const puntos = transcurridos.flatMap((d, i) =>
    d.UYU > 0 || d.USD > 0
      ? [{ dia: i + 1, pesos: d.UYU, dolares: d.USD, x: ((i + 1) / dias.length) * 100, y: y(acumulado[i]) }]
      : [],
  );
  const mayor = puntos.reduce<(typeof puntos)[number] | null>(
    (max, p) => (p.pesos > (max?.pesos ?? 0) ? p : max),
    null,
  );

  return (
    <section aria-labelledby="tarjeta-mes-titulo" className="tarjeta-mes aparece">
      <div className="tarjeta-mes-cuerpo">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="tarjeta-mes-titulo" className="tarjeta-mes-rotulo">
              {mes} <span aria-hidden>·</span> día {hoy} de {dias.length}
            </h2>
            {pendientes > 0 && (
              <span className="tarjeta-mes-pastilla">
                Faltan fijos por <span className="monto">{formatMoney(pendientes, "UYU")}</span>
              </span>
            )}
          </div>

          <p className="mt-3 text-sm text-[var(--mes-suave)]">
            {temprano ? "Lo gastado hasta hoy" : "A este ritmo cerrás el mes en"}
          </p>
          <p className="tarjeta-mes-cifra">{formatMoney(temprano ? pesos : proyeccion, "UYU")}</p>
          {comparacion && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-[var(--mes-suave)]">
              {Math.abs(comparacion.diferencia) < 1 ? (
                <>Igual que en {comparacion.mes} a esta altura.</>
              ) : (
                <>
                  <span aria-hidden className={`tarjeta-mes-flecha ${comparacion.diferencia > 0 ? "sube" : "baja"}`}>
                    {comparacion.diferencia > 0 ? "↑" : "↓"}
                  </span>
                  <span>
                    <span className="monto text-[var(--mes-texto)]">
                      {formatMoney(Math.abs(comparacion.diferencia), "UYU")}
                    </span>{" "}
                    {comparacion.diferencia > 0 ? "más" : "menos"} que en {comparacion.mes} a esta altura
                  </span>
                </>
              )}
            </p>
          )}
        </div>

        {/* La curva: las líneas en SVG (se estiran con la tarjeta) y los
            puntos encima en HTML, para que sigan redondos a cualquier ancho. */}
        <div>
          <div
            role="img"
            aria-label={`Lo gastado en ${nombreMes}, día a día: ${formatMoney(pesos, "UYU")} hasta hoy${
              temprano ? "" : `, ${formatMoney(proyeccion, "UYU")} a fin de mes a este ritmo`
            }${comparacion ? `; ${comparacion.mes} es la línea de fondo` : ""}.`}
            className="curva-mes"
          >
            <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="curva-trazos">
              {acumuladoAnterior.length > 0 && (
                <path
                  d={linea(acumuladoAnterior, acumuladoAnterior.length)}
                  className="curva-anterior"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              <path d={`${linea(acumulado, dias.length)} L${xHoy.toFixed(2)} 100 Z`} className="curva-relleno" />
              <path d={linea(acumulado, dias.length)} className="curva-actual" vectorEffect="non-scaling-stroke" />
              {!temprano && hoy < dias.length && (
                <path
                  d={`M${xHoy.toFixed(2)} ${y(pesos).toFixed(2)} L100 ${y(proyeccion).toFixed(2)}`}
                  className="curva-ritmo"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>
            {puntos.map((p, i) => (
              <span
                key={p.dia}
                aria-hidden
                title={`Día ${p.dia}: ${[
                  p.pesos > 0 ? formatMoney(p.pesos, "UYU") : null,
                  p.dolares > 0 ? formatMoney(p.dolares, "USD") : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}`}
                className={`curva-punto ${p === mayor ? "mayor" : ""} ${p.dia === hoy ? "hoy" : ""} ${
                  p.dolares > 0 ? "dolar" : ""
                }`}
                style={
                  {
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    "--demora": `${(0.2 + (p.x / 100) * 1.2 + i * 0.01).toFixed(2)}s`,
                  } as React.CSSProperties
                }
              />
            ))}
            {!temprano && hoy < dias.length && (
              <span aria-hidden className="curva-meta" style={{ top: `${y(proyeccion)}%` }} />
            )}
            <div aria-hidden className="curva-eje">
              {hoy > 3 && <span className="left-0">1</span>}
              <span className="-translate-x-1/2" style={{ left: `${xHoy}%` }}>
                hoy
              </span>
              {hoy < dias.length - 2 && <span className="right-0">{dias.length}</span>}
            </div>
          </div>
          <p aria-hidden className="curva-leyenda">
            <span>
              <i className="actual" />
              Este mes
            </span>
            {!temprano && (
              <span>
                <i className="ritmo" />A este ritmo
              </span>
            )}
            {acumuladoAnterior.length > 0 && comparacion && (
              <span>
                <i className="anterior" />
                {comparacion.mes.charAt(0).toUpperCase() + comparacion.mes.slice(1)}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="tarjeta-mes-pie">
        <dl className="tarjeta-mes-datos">
          <div>
            <dt>Por día</dt>
            <dd className="monto">{formatMoney(promedio, "UYU")}</dd>
          </div>
          <div>
            <dt>Días con gastos</dt>
            <dd className="monto">
              {diasConGasto} <span className="text-[var(--mes-tenue)]">de {hoy}</span>
            </dd>
          </div>
          <div>
            <dt>Día más caro</dt>
            <dd className="monto">{mayor ? `el ${mayor.dia}` : "—"}</dd>
          </div>
        </dl>
        <Link href="/monthly" className="tarjeta-mes-enlace">
          Ver el mes <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
