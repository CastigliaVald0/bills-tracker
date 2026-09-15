"use client";

import { useState, type ReactNode } from "react";
import estilos from "./TortaCombinada.module.css";

/**
 * Torta "Gasto combinado por mes": pesos y dólares (convertidos) en un solo
 * total por mes. El diseño es el del artefacto aprobado, sin cambios; acá solo
 * se reemplazan los datos de ejemplo por los reales.
 *
 * Cada mes tiene su color fijo, así que si un mes no tuvo gasto y no aparece,
 * los demás conservan el suyo.
 */
const MESES = [
  { nombre: "Enero", color: "#c96f4a" },
  { nombre: "Febrero", color: "#4a7c8c" },
  { nombre: "Marzo", color: "#8a9a5b" },
  { nombre: "Abril", color: "#b98fc9" },
  { nombre: "Mayo", color: "#d4a94a" },
  { nombre: "Junio", color: "#5b8a7a" },
  { nombre: "Julio", color: "#a15b8c" },
  { nombre: "Agosto", color: "#4a8fc9" },
  { nombre: "Setiembre", color: "#c98a4a" },
  { nombre: "Octubre", color: "#6b9a5b" },
  { nombre: "Noviembre", color: "#8c5ba1" },
  { nombre: "Diciembre", color: "#c94a5b" },
];

const CX = 130;
const CY = 130;
const R_INTERIOR = 66;
const R_EXTERIOR = 100;
/** Separación entre porciones, en grados. */
const SEPARACION = 3;
/** Cuánto se aleja la porción al pasar el mouse. */
const DESPLAZAMIENTO = 10;

/**
 * Math.sin y Math.cos difieren en el último dígito entre Node y el navegador, y
 * React compara los atributos del SVG carácter a carácter al hidratar. Con tres
 * decimales la diferencia desaparece y sigue siendo mucho más fino que un píxel.
 */
function redondear(n: number) {
  return Math.round(n * 1000) / 1000;
}

function polar(cx: number, cy: number, r: number, grados: number): [number, number] {
  const rad = ((grados - 90) * Math.PI) / 180;
  return [redondear(cx + r * Math.cos(rad)), redondear(cy + r * Math.sin(rad))];
}

function caminoDelArco(inicio: number, fin: number) {
  const [x1, y1] = polar(CX, CY, R_EXTERIOR, inicio);
  const [x2, y2] = polar(CX, CY, R_EXTERIOR, fin);
  const [x3, y3] = polar(CX, CY, R_INTERIOR, fin);
  const [x4, y4] = polar(CX, CY, R_INTERIOR, inicio);
  const arcoLargo = fin - inicio > 180 ? 1 : 0;
  return [
    `M ${x1} ${y1}`,
    `A ${R_EXTERIOR} ${R_EXTERIOR} 0 ${arcoLargo} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${R_INTERIOR} ${R_INTERIOR} 0 ${arcoLargo} 0 ${x4} ${y4}`,
    "Z",
  ].join(" ");
}

type Gajo = { mes: number; monto: number };

export function TortaCombinada({ datos, nota }: { datos: Gajo[]; nota: ReactNode }) {
  const [activo, setActivo] = useState<number | null>(null);

  const total = datos.reduce((suma, d) => suma + d.monto, 0);
  if (total <= 0) return null;

  const porciones: (Gajo & {
    nombre: string;
    color: string;
    camino: string;
    dx: number;
    dy: number;
    porcentaje: string;
  })[] = [];

  let angulo = 0;
  for (const d of datos) {
    const barrido = (d.monto / total) * 360;
    const inicio = angulo + SEPARACION / 2;
    // Un mes muy chico (menos de 3°) quedaría con el fin antes del inicio y el
    // arco se dibujaría al revés; se le deja una astilla mínima visible.
    const fin = Math.max(angulo + barrido - SEPARACION / 2, inicio + 0.6);
    const medio = (inicio + fin) / 2;
    const [dx, dy] = polar(0, 0, DESPLAZAMIENTO, medio);

    porciones.push({
      ...d,
      nombre: MESES[d.mes].nombre,
      color: MESES[d.mes].color,
      camino: caminoDelArco(inicio, fin),
      dx,
      dy,
      porcentaje: ((d.monto / total) * 100).toFixed(1),
    });
    angulo += barrido;
  }

  const seleccionada = porciones.find((p) => p.mes === activo) ?? null;

  return (
    <div className={estilos.card}>
      <h3 className={estilos.titulo}>Gasto combinado por mes</h3>
      <p className={estilos.sub}>Pasá el mouse o tocá una porción para ver el detalle</p>

      <div className={estilos.layout}>
        <div className={estilos.chartWrap}>
          <svg
            width="260"
            height="260"
            viewBox="0 0 260 260"
            role="img"
            aria-label="Gasto combinado de pesos y dólares, por mes"
          >
            {porciones.map((p) => {
              const esActiva = activo === p.mes;
              return (
                <path
                  key={p.mes}
                  d={p.camino}
                  fill={p.color}
                  className={estilos.slice}
                  style={{
                    transform: esActiva ? `translate(${p.dx}px, ${p.dy}px)` : "translate(0,0)",
                    opacity: activo === null || esActiva ? 1 : 0.45,
                  }}
                  onMouseEnter={() => setActivo(p.mes)}
                  onMouseLeave={() => setActivo(null)}
                  onTouchStart={() => setActivo(p.mes)}
                />
              );
            })}
          </svg>

          <div className={estilos.centerLabel}>
            <div className={estilos.month}>{seleccionada ? seleccionada.nombre : "Total"}</div>
            <div className={estilos.pct}>
              {seleccionada ? `${seleccionada.porcentaje}%` : "100%"}
            </div>
            <div className={estilos.hint}>
              {seleccionada
                ? "$" + Math.round(seleccionada.monto).toLocaleString("es-UY")
                : "del año"}
            </div>
          </div>
        </div>

        <div className={estilos.legend}>
          {porciones.map((p) => (
            <div
              key={p.mes}
              className={`${estilos.legendRow} ${activo === p.mes ? estilos.active : ""}`}
              onMouseEnter={() => setActivo(p.mes)}
              onMouseLeave={() => setActivo(null)}
            >
              <span className={estilos.legendDot} style={{ background: p.color }} />
              <span className={estilos.legendMonth}>{p.nombre}</span>
              <span className={estilos.legendPct}>{p.porcentaje}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className={estilos.foot}>{nota}</div>
    </div>
  );
}
