"use client";

import { useState } from "react";

/** Saturación fija: todos los colores salen igual de vivos, como los de la app. */
const SATURACION = 70;
/** Del tono más oscuro al más claro que se puede elegir. Más oscuro que el
    mínimo, el color se pierde sobre el fondo de la app. */
const LUZ_MINIMA = 38;
const LUZ_MAXIMA = 76;

function hslAHex(h: number, s: number, l: number) {
  const sat = s / 100;
  const luz = l / 100;
  const a = sat * Math.min(luz, 1 - luz);
  const canal = (n: number) => {
    const k = (n + h / 30) % 12;
    const valor = luz - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(valor * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${canal(0)}${canal(8)}${canal(4)}`;
}

/** El tono (0-360) y la luz de un #rrggbb, para ubicar las barras al abrir. */
function hexAHsl(hex: string): { h: number; l: number } {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return { h: Math.round(h), l: Math.round(l * 100) };
}

const limitarLuz = (l: number) => Math.min(LUZ_MAXIMA, Math.max(LUZ_MINIMA, l));

/**
 * Elegir el color de una categoría con dos barras: arriba todos los colores,
 * abajo qué tan oscuro o claro. Reemplaza a la paleta del sistema, que en cada
 * celular era distinta y dejaba elegir colores que no se veían sobre el fondo.
 */
export function SelectorColor({
  valor,
  alCambiar,
}: {
  valor: string;
  alCambiar: (hex: string) => void;
}) {
  const inicial = hexAHsl(valor);
  const [tono, setTono] = useState(inicial.h);
  const [luz, setLuz] = useState(limitarLuz(inicial.l));
  const [ultimoValor, setUltimoValor] = useState(valor);

  // Si el color cambia desde afuera (por ejemplo, al vaciar el formulario),
  // las barras se acomodan a él.
  if (valor !== ultimoValor) {
    setUltimoValor(valor);
    if (valor !== hslAHex(tono, SATURACION, luz)) {
      const nuevo = hexAHsl(valor);
      setTono(nuevo.h);
      setLuz(limitarLuz(nuevo.l));
    }
  }

  function cambiar(nuevoTono: number, nuevaLuz: number) {
    setTono(nuevoTono);
    setLuz(nuevaLuz);
    const hex = hslAHex(nuevoTono, SATURACION, nuevaLuz);
    setUltimoValor(hex);
    alCambiar(hex);
  }

  const colores = Array.from({ length: 13 }, (_, i) => `hsl(${i * 30} ${SATURACION}% 56%)`).join(", ");

  return (
    <div className="flex items-center gap-4">
      <span
        aria-hidden
        className="h-12 w-12 shrink-0 rounded-full border border-borde-fuerte"
        style={{ backgroundColor: valor }}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <input
          type="range"
          min={0}
          max={359}
          value={tono}
          onChange={(e) => cambiar(Number(e.target.value), luz)}
          aria-label="Color"
          className="deslizador"
          style={{ background: `linear-gradient(90deg, ${colores})` }}
        />
        <input
          type="range"
          min={LUZ_MINIMA}
          max={LUZ_MAXIMA}
          value={luz}
          onChange={(e) => cambiar(tono, Number(e.target.value))}
          aria-label="Tono: más oscuro o más claro"
          className="deslizador"
          style={{
            background: `linear-gradient(90deg, hsl(${tono} ${SATURACION}% ${LUZ_MINIMA}%), hsl(${tono} ${SATURACION}% ${LUZ_MAXIMA}%))`,
          }}
        />
      </div>
    </div>
  );
}
