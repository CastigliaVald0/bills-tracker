"use client";

import { useState } from "react";
import { monthShortLabel } from "@/lib/format";

type Gajo = { mes: number; monto: number };

const RADIO = 100;
/** Cuánto se separa cada gajo del centro. */
const SEPARACION = 7;
/** Debajo de este porcentaje el gajo no tiene ancho para alojar el número. */
const MINIMO_PARA_ROTULO = 0.06;

/**
 * Misma rampa que la torta por moneda: el color dice en qué parte del año cae
 * el mes, no qué mes es. Doce tonos no pueden distinguirse entre sí, así que la
 * identidad la cargan la leyenda y el rótulo. Arranca en 47% de mezcla, el piso
 * que despeja 2:1 contra la tarjeta.
 */
function colorDelMes(mes: number) {
  const proporcion = 0.47 + (1 - 0.47) * (mes / 11);
  return `color-mix(in srgb, var(--peso) ${(proporcion * 100).toFixed(1)}%, var(--superficie))`;
}

/**
 * Redondea la coordenada antes de que llegue al SVG.
 *
 * Math.sin y Math.cos no dan resultados idénticos bit a bit entre el Node que
 * renderiza en el servidor y el motor del navegador: difieren en el último
 * dígito (-18.163685097943645 contra -18.16368509794364). React compara los
 * atributos carácter a carácter y eso alcanza para romper la hidratación.
 * Con radio 100 la tercera decimal ya es muchísimo más fina que un píxel.
 */
function redondear(n: number) {
  return Math.round(n * 1000) / 1000;
}

function punto(anguloRad: number, radio: number) {
  return {
    x: redondear(Math.cos(anguloRad) * radio),
    y: redondear(Math.sin(anguloRad) * radio),
  };
}

export function TortaCombinada({ datos }: { datos: Gajo[] }) {
  const [activo, setActivo] = useState<number | null>(null);

  const total = datos.reduce((suma, g) => suma + g.monto, 0);
  if (total <= 0) return null;

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

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Leyenda arriba. Lleva el porcentaje además del mes: el número de
          adentro del gajo queda así duplicado en texto plano, y nadie depende
          de leerlo sobre el color. */}
      <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {gajos.map((g) => (
          <li
            key={g.mes}
            className="flex cursor-default items-center gap-1.5 transition-opacity"
            style={{ opacity: activo === null || activo === g.mes ? 1 : 0.4 }}
            onMouseEnter={() => setActivo(g.mes)}
            onMouseLeave={() => setActivo(null)}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: colorDelMes(g.mes) }}
              aria-hidden
            />
            <span className="text-xs text-texto">
              {monthShortLabel(g.mes).replace(".", "")}
            </span>
            <span className="monto text-xs text-tenue">
              {Math.round(g.porcion * 100)}%
            </span>
          </li>
        ))}
      </ul>

      <svg
        viewBox="-118 -118 236 236"
        className="h-64 w-64 sm:h-72 sm:w-72"
        role="img"
        aria-label="Reparto del gasto del año por mes, pesos y dólares combinados"
      >
        {gajos.map((g) => {
          const atenuado = activo !== null && activo !== g.mes;
          // Cada gajo se corre hacia afuera por su bisectriz: es la separación
          // del formato pedido y de paso despega gajos vecinos parecidos.
          const centro = punto(g.medio, SEPARACION);
          const a = punto(g.desde, RADIO);
          const b = punto(g.hasta, RADIO);
          const arcoLargo = g.hasta - g.desde > Math.PI ? 1 : 0;
          const d = `M 0 0 L ${a.x} ${a.y} A ${RADIO} ${RADIO} 0 ${arcoLargo} 1 ${b.x} ${b.y} Z`;

          return (
            <g
              key={g.mes}
              transform={`translate(${centro.x} ${centro.y})`}
              className="transition-opacity"
              opacity={atenuado ? 0.35 : 1}
              onMouseEnter={() => setActivo(g.mes)}
              onMouseLeave={() => setActivo(null)}
              onFocus={() => setActivo(g.mes)}
              onBlur={() => setActivo(null)}
              tabIndex={0}
              aria-label={`${monthShortLabel(g.mes)}: ${Math.round(g.porcion * 100)}%`}
            >
              {soloUno ? (
                <circle cx={0} cy={0} r={RADIO} style={{ fill: colorDelMes(g.mes) }} />
              ) : (
                <path d={d} style={{ fill: colorDelMes(g.mes) }} />
              )}
            </g>
          );
        })}

        {/* Los rótulos van al final para quedar por encima de todos los gajos. */}
        {gajos
          .filter((g) => g.porcion >= MINIMO_PARA_ROTULO)
          .map((g) => {
            const centro = punto(g.medio, SEPARACION);
            const p = punto(g.medio, RADIO * 0.62);
            const atenuado = activo !== null && activo !== g.mes;
            return (
              <text
                key={g.mes}
                x={redondear(centro.x + p.x)}
                y={redondear(centro.y + p.y)}
                textAnchor="middle"
                dominantBaseline="middle"
                opacity={atenuado ? 0.35 : 1}
                className="pointer-events-none text-[11px] font-semibold"
                style={{
                  fontFamily: "var(--font-num), ui-monospace, monospace",
                  fill: "var(--texto)",
                  /* El contorno es lo que sostiene la lectura: sobre la franja
                     media de la rampa ninguna tinta plana llega a 4,5:1, así
                     que el número se recorta contra la superficie. Acompaña al
                     tamaño del texto: con un grosor fijo, al achicar la cifra
                     el contorno se la come. */
                  stroke: "var(--superficie)",
                  strokeWidth: 2.75,
                  strokeLinejoin: "round",
                  paintOrder: "stroke",
                }}
              >
                {Math.round(g.porcion * 100)}%
              </text>
            );
          })}
      </svg>
    </div>
  );
}
