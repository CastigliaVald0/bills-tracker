"use client";

import { useState } from "react";
import { formatMoney, monthShortLabel } from "@/lib/format";

type Gajo = { mes: number; monto: number };

const RADIO = 100;
const RADIO_ROTULO = 118;
/** Debajo de este porcentaje el gajo es muy fino para etiquetarlo sin pisarse. */
const MINIMO_PARA_ROTULO = 0.07;

/**
 * El color dice EN QUÉ PARTE DEL AÑO cae el mes, no qué mes es.
 *
 * Doce gajos no pueden distinguirse por color: una rampa de un solo tono
 * admite 5 pasos separables en tema claro y 6 en oscuro (medido con el
 * validador de la guía; el mínimo es 0.06 de luminosidad por paso). Por eso
 * la identidad la cargan la posición en el círculo, el rótulo y el detalle
 * de abajo, y la rampa queda como refuerzo del orden: enero pálido,
 * diciembre pleno. Se arma con color-mix contra la superficie para que se
 * adapte sola al tema claro y al oscuro.
 *
 * La mezcla arranca en 47%, que es el piso que despeja 2:1 de contraste
 * contra la tarjeta; por debajo el gajo más pálido deja de leerse.
 */
function colorDelMes(mes: number, tono: string) {
  const proporcion = 0.47 + (1 - 0.47) * (mes / 11);
  return `color-mix(in srgb, ${tono} ${(proporcion * 100).toFixed(1)}%, var(--superficie))`;
}

function puntoEnCirculo(anguloRad: number, radio: number) {
  return { x: Math.cos(anguloRad) * radio, y: Math.sin(anguloRad) * radio };
}

function caminoDelGajo(desde: number, hasta: number) {
  const a = puntoEnCirculo(desde, RADIO);
  const b = puntoEnCirculo(hasta, RADIO);
  const arcoLargo = hasta - desde > Math.PI ? 1 : 0;
  return `M 0 0 L ${a.x} ${a.y} A ${RADIO} ${RADIO} 0 ${arcoLargo} 1 ${b.x} ${b.y} Z`;
}

export function TortaMeses({
  datos,
  moneda,
  tono,
}: {
  datos: Gajo[];
  moneda: "UYU" | "USD";
  tono: string;
}) {
  const [activo, setActivo] = useState<number | null>(null);

  const total = datos.reduce((suma, g) => suma + g.monto, 0);
  if (total <= 0) return null;

  // Arranca a las 12 y avanza en sentido horario, como un reloj: el año se
  // recorre girando.
  const gajos: (Gajo & { porcion: number; desde: number; hasta: number; medio: number })[] = [];
  let angulo = -Math.PI / 2;
  for (const g of datos) {
    const porcion = g.monto / total;
    const desde = angulo;
    const hasta = angulo + porcion * Math.PI * 2;
    angulo = hasta;
    gajos.push({ ...g, porcion, desde, hasta, medio: (desde + hasta) / 2 });
  }

  const soloUno = gajos.length === 1;
  const gajoActivo = gajos.find((g) => g.mes === activo) ?? null;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-7">
      <div className="flex shrink-0 flex-col items-center gap-2">
        {/* El viewBox deja aire de sobra alrededor del radio 100: los rótulos
            se dibujan a 118 y el texto se extiende hacia afuera, así que con
            menos margen se cortan las tres letras del mes. */}
        <svg
          viewBox="-160 -160 320 320"
          className="h-56 w-56"
          role="img"
          aria-label={`Reparto del año por mes en ${moneda === "UYU" ? "pesos" : "dólares"}`}
        >
          {gajos.map((g) => {
            const resaltado = activo === g.mes;
            return (
              <g key={g.mes}>
                {soloUno ? (
                  <circle
                    cx={0}
                    cy={0}
                    r={RADIO}
                    style={{ fill: colorDelMes(g.mes, tono) }}
                    stroke="var(--superficie)"
                    strokeWidth={2}
                  />
                ) : (
                  <path
                    d={caminoDelGajo(g.desde, g.hasta)}
                    style={{ fill: colorDelMes(g.mes, tono) }}
                    /* El aro de 2px contra la superficie separa gajos vecinos
                       de tono parecido. */
                    stroke="var(--superficie)"
                    strokeWidth={2}
                    className="cursor-default transition-opacity"
                    opacity={activo === null || resaltado ? 1 : 0.45}
                    onMouseEnter={() => setActivo(g.mes)}
                    onMouseLeave={() => setActivo(null)}
                    onFocus={() => setActivo(g.mes)}
                    onBlur={() => setActivo(null)}
                    tabIndex={0}
                    aria-label={`${monthShortLabel(g.mes)}: ${formatMoney(g.monto, moneda)}, ${Math.round(g.porcion * 100)}%`}
                  />
                )}
              </g>
            );
          })}

          {/* Rótulos por fuera del gajo: en tokens de texto, nunca sobre el
              color, así no dependen del contraste contra el relleno. */}
          {gajos
            .filter((g) => g.porcion >= MINIMO_PARA_ROTULO)
            .map((g) => {
              const p = puntoEnCirculo(g.medio, RADIO_ROTULO);
              const izquierda = Math.cos(g.medio) < -0.15;
              const derecha = Math.cos(g.medio) > 0.15;
              return (
                <text
                  key={g.mes}
                  x={p.x}
                  y={p.y}
                  textAnchor={izquierda ? "end" : derecha ? "start" : "middle"}
                  dominantBaseline="middle"
                  className="fill-suave text-[13px] uppercase"
                  style={{ fontFamily: "var(--font-num), ui-monospace, monospace" }}
                >
                  {monthShortLabel(g.mes).replace(".", "")}
                </text>
              );
            })}
        </svg>

        {/* La lectura del gajo apuntado va DEBAJO de la torta, no encima: sobre
            los gajos de color el texto no tendría contraste. La altura está
            reservada para que la tarjeta no salte al pasar el mouse. */}
        <div className="flex h-9 flex-col items-center justify-center text-center">
          {gajoActivo ? (
            <>
              <p className="monto text-sm text-texto">
                {monthShortLabel(gajoActivo.mes).replace(".", "")} ·{" "}
                {formatMoney(gajoActivo.monto, moneda)}
              </p>
              <p className="monto text-xs text-suave">
                {Math.round(gajoActivo.porcion * 100)}% del año
              </p>
            </>
          ) : (
            <p className="rotulo">{gajos.length === 1 ? "1 mes" : `${gajos.length} meses`}</p>
          )}
        </div>
      </div>

      {/* El detalle es también la versión en tabla: cada mes con su cifra,
          para no depender del color ni del hover. */}
      <ul className="flex w-full min-w-0 flex-col gap-1.5">
        {gajos.map((g) => (
          <li
            key={g.mes}
            className="flex items-center gap-2.5 rounded px-1.5 py-1 transition-colors"
            style={{ backgroundColor: activo === g.mes ? "var(--superficie-alta)" : undefined }}
            onMouseEnter={() => setActivo(g.mes)}
            onMouseLeave={() => setActivo(null)}
          >
            <span
              className="punto"
              style={{ backgroundColor: colorDelMes(g.mes, tono) }}
              aria-hidden
            />
            <span className="rotulo w-8 shrink-0 normal-case">
              {monthShortLabel(g.mes).replace(".", "")}
            </span>
            <span className="monto w-10 shrink-0 text-xs text-suave">
              {Math.round(g.porcion * 100)}%
            </span>
            <span className="monto ml-auto text-xs text-texto">
              {formatMoney(g.monto, moneda)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
