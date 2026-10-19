"use client";

import { useState } from "react";
import { Conmutador } from "@/components/CamposGasto";
import { formatMoney } from "@/lib/format";
import type { TotalCategoria } from "@/components/ListaCategorias";

type Moneda = "UYU" | "USD";

const TAMANO = 240;
const CENTRO = TAMANO / 2;
const RADIO = 91;
const GROSOR = 26;
/** Lo mínimo que ocupa una porción. Tiene que ser más que la punta redonda
    de la anterior, que se le apoya encima: si no, la taparía entera. */
const BARRIDO_MINIMO = 14;

/**
 * Math.sin y Math.cos pueden diferir en el último dígito entre el servidor y
 * el navegador, y React compara los atributos del SVG al hidratar. Con tres
 * decimales la diferencia desaparece y sigue siendo más fino que un píxel.
 */
const redondear = (n: number) => Math.round(n * 1000) / 1000;

function punto(radio: number, grados: number): [number, number] {
  const rad = ((grados - 90) * Math.PI) / 180;
  return [redondear(CENTRO + radio * Math.cos(rad)), redondear(CENTRO + radio * Math.sin(rad))];
}

/** El trazo de una porción, sobre el radio medio del anillo. */
function trazo(inicio: number, fin: number) {
  const [x1, y1] = punto(RADIO, inicio);
  const [x2, y2] = punto(RADIO, fin);
  const largo = fin - inicio > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${RADIO} ${RADIO} 0 ${largo} 1 ${x2} ${y2}`;
}

/**
 * Reparte los 360° del anillo según cada monto, pero sin dejar ninguna porción
 * por debajo del mínimo. Las que quedarían chicas reciben el mínimo y lo que
 * sobra se reparte en proporción entre las demás; se repite hasta que ninguna
 * quede corta. Antes el mínimo se agregaba encima y la porción chica se metía
 * sobre la de al lado.
 */
function repartirAngulos(montos: number[]): number[] {
  if (montos.length === 1) return [360];
  // Con muchísimas categorías el mínimo se achica para que entren todas.
  const minimo = Math.min(BARRIDO_MINIMO, (360 / montos.length) * 0.6);
  const chicas = new Set<number>();
  for (;;) {
    const libres = 360 - chicas.size * minimo;
    const totalGrandes = montos.reduce((t, m, i) => (chicas.has(i) ? t : t + m), 0);
    const barridos = montos.map((m, i) => (chicas.has(i) ? minimo : (m / totalGrandes) * libres));
    const nuevas = barridos.findIndex((b, i) => !chicas.has(i) && b < minimo);
    if (nuevas === -1) return barridos;
    chicas.add(nuevas);
  }
}

/**
 * En qué se fue la plata: un anillo con una porción por categoría, cada una en
 * su color, con la punta final redondeada apoyada sobre la siguiente. En el centro va el total; al pasar el
 * mouse o tocar una porción (o su nombre en la leyenda), el centro muestra qué
 * parte del total se llevó esa categoría.
 *
 * Como en el resto de la app, las dos monedas no se suman: si hubo gastos en
 * dólares, un conmutador cambia el anillo entre pesos y dólares.
 */
export function AnilloCategorias({ categorias }: { categorias: TotalCategoria[] }) {
  const hayPesos = categorias.some((c) => c.UYU > 0);
  const hayDolares = categorias.some((c) => c.USD > 0);
  const [moneda, setMoneda] = useState<Moneda>(hayPesos ? "UYU" : "USD");
  const [activa, setActiva] = useState<string | null>(null);

  const filas = categorias
    .filter((c) => c[moneda] > 0)
    .map((c) => ({ nombre: c.name, color: c.color, emoji: c.emoji ?? null, monto: c[moneda] }))
    .sort((a, b) => b.monto - a.monto);
  const total = filas.reduce((suma, f) => suma + f.monto, 0);
  if (total <= 0) return null;

  // Cada porción con su ángulo. Una sola categoría ocupa el anillo entero.
  const porciones: ((typeof filas)[number] & { inicio: number; fin: number; porcentaje: number })[] = [];
  const barridos = repartirAngulos(filas.map((f) => f.monto));
  let angulo = 0;
  filas.forEach((f, i) => {
    porciones.push({
      ...f,
      inicio: angulo,
      fin: angulo + barridos[i],
      porcentaje: (f.monto / total) * 100,
    });
    angulo += barridos[i];
  });

  const elegida = porciones.find((p) => p.nombre === activa) ?? null;
  // Con una categoría elegida, las demás se apagan mezclando su color con el
  // fondo, no con transparencia: transparentes, las puntas que se apoyan unas
  // sobre otras dejaban ver la superposición.
  const tono = (p: { nombre: string; color: string }) =>
    elegida && elegida.nombre !== p.nombre ? `color-mix(in srgb, ${p.color} 28%, var(--fondo))` : p.color;
  const porcentajeTexto = (p: number) => (p < 1 ? "<1%" : `${Math.round(p)}%`);

  return (
    // Sin tarjeta: el anillo va directo sobre el fondo de la página.
    <div>
      {hayPesos && hayDolares && (
        <div className="mb-2 flex justify-end">
          <Conmutador<Moneda>
            nombreGrupo="moneda-anillo"
            etiqueta="Moneda del gráfico"
            opciones={[
              { valor: "UYU", texto: "Pesos", color: "var(--peso)" },
              { valor: "USD", texto: "Dólares", color: "var(--dolar)" },
            ]}
            valor={moneda}
            alCambiar={(m) => {
              setMoneda(m);
              setActiva(null);
            }}
          />
        </div>
      )}

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
        <div className="relative shrink-0" style={{ width: TAMANO, height: TAMANO }}>
          {/* `key` por moneda: al pasar de pesos a dólares el anillo se vuelve
              a montar y se dibuja de nuevo (ver .anillo-trazar). */}
          <svg
            key={moneda}
            className="anillo-trazar"
            width={TAMANO}
            height={TAMANO}
            viewBox={`0 0 ${TAMANO} ${TAMANO}`}
            role="img"
            aria-label={`Gasto por categoría en ${moneda === "UYU" ? "pesos" : "dólares"}`}
            onMouseLeave={() => setActiva(null)}
          >
            {/* Cada porción es un trazo, y su punta final es un círculo de su
                color que se apoya sobre el comienzo de la siguiente: así cada
                categoría termina redondeada, tocando a la que viene. Primero
                van todos los trazos y después todas las puntas, para que cada
                punta quede por encima de su vecina. */}
            {filas.length === 1 ? (
              <circle
                cx={CENTRO}
                cy={CENTRO}
                r={RADIO}
                fill="none"
                stroke={porciones[0].color}
                strokeWidth={GROSOR}
                className="cursor-pointer"
                onMouseEnter={() => setActiva(porciones[0].nombre)}
                onClick={() => setActiva(activa ? null : porciones[0].nombre)}
              />
            ) : (
              <>
                {porciones.map((p) => (
                  <path
                    key={p.nombre}
                    d={trazo(p.inicio, p.fin)}
                    fill="none"
                    strokeWidth={GROSOR}
                    style={{ stroke: tono(p) }}
                    className="cursor-pointer transition-[stroke] duration-200"
                    onMouseEnter={() => setActiva(p.nombre)}
                    onClick={() => setActiva(elegida?.nombre === p.nombre ? null : p.nombre)}
                  />
                ))}
                {porciones.map((p) => {
                  const [x, y] = punto(RADIO, p.fin);
                  return (
                    <circle
                      key={`punta-${p.nombre}`}
                      cx={x}
                      cy={y}
                      r={GROSOR / 2}
                      style={{ fill: tono(p) }}
                      className="cursor-pointer transition-[fill] duration-200"
                      onMouseEnter={() => setActiva(p.nombre)}
                      onClick={() => setActiva(elegida?.nombre === p.nombre ? null : p.nombre)}
                    />
                  );
                })}
                {/* La elegida se vuelve a dibujar arriba de todo, redondeada en
                    los dos extremos: así se lee entera, sin la punta de la
                    anterior mordiéndole el comienzo. */}
                {elegida && (
                  <g pointerEvents="none">
                    <path d={trazo(elegida.inicio, elegida.fin)} fill="none" stroke={elegida.color} strokeWidth={GROSOR} />
                    {[elegida.inicio, elegida.fin].map((grados) => {
                      const [x, y] = punto(RADIO, grados);
                      return <circle key={grados} cx={x} cy={y} r={GROSOR / 2} fill={elegida.color} />;
                    })}
                  </g>
                )}
              </>
            )}
          </svg>

          {/* El centro: el total, o la categoría elegida. */}
          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-12 text-center"
            aria-live="polite"
          >
            {elegida ? (
              <>
                <span className="flex max-w-full items-center gap-1.5 text-xs text-suave">
                  <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: elegida.color }} />
                  <span className="truncate">
                    {elegida.emoji && `${elegida.emoji} `}
                    {elegida.nombre}
                  </span>
                </span>
                {/* Solo la parte del total: el monto de cada categoría está en
                    la lista de abajo. */}
                <span className="monto mt-1 text-3xl text-texto">{porcentajeTexto(elegida.porcentaje)}</span>
                <span className="mt-0.5 text-xs text-tenue">del total</span>
              </>
            ) : (
              <>
                <span className="monto text-xl text-texto">{formatMoney(total, moneda)}</span>
                <span className="mt-1 text-xs text-tenue">gastado</span>
              </>
            )}
          </div>
        </div>

        {/* La leyenda: también elige, y es lo accesible del gráfico para el
            teclado y para las porciones tan finas que no se pueden tocar. */}
        <ul className="flex w-full min-w-0 flex-col gap-0.5">
          {porciones.map((p) => {
            const esLaElegida = elegida?.nombre === p.nombre;
            return (
              <li key={p.nombre}>
                <button
                  type="button"
                  aria-pressed={esLaElegida}
                  onMouseEnter={() => setActiva(p.nombre)}
                  onMouseLeave={() => setActiva(null)}
                  onFocus={() => setActiva(p.nombre)}
                  onBlur={() => setActiva(null)}
                  onClick={() => setActiva(esLaElegida ? null : p.nombre)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                    esLaElegida ? "bg-superficie-alta text-texto" : "text-suave hover:text-texto"
                  } ${elegida && !esLaElegida ? "opacity-60" : ""}`}
                >
                  {/* El punto une el nombre con su porción del anillo; el
                      emoji, si tiene, va al lado del nombre. */}
                  <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="min-w-0 flex-1 truncate">
                    {p.emoji && <span aria-hidden className="mr-1.5">{p.emoji}</span>}
                    {p.nombre}
                  </span>
                  <span className="monto shrink-0 text-xs text-tenue">{porcentajeTexto(p.porcentaje)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
