"use client";

import { useState, useSyncExternalStore } from "react";
import { CATEGORIAS_DE_EMOJI, ultimoEmoji } from "@/lib/emoji";

/** ¿Pantalla táctil? Ahí está el teclado de emojis del celular. */
const CONSULTA_TACTIL = "(pointer: coarse)";
function suscribirseATactil(aviso: () => void) {
  const consulta = window.matchMedia(CONSULTA_TACTIL);
  consulta.addEventListener("change", aviso);
  return () => consulta.removeEventListener("change", aviso);
}

/**
 * Elegir el emoji de una categoría o de una sección: un cuadrado con "+" y, al
 * lado, el emoji elegido. Cómo se elige depende del dispositivo:
 *
 * - En el celular, el "+" abre su teclado y se elige desde la tecla de
 *   emojis. El "+" es un campo de texto de verdad, disfrazado, así el celular
 *   abre el teclado sin trucos; siempre queda vacío, lo escrito se lee y se
 *   descarta, y las letras se ignoran.
 * - En la PC no hay un teclado de emojis a mano, así que el "+" abre un panel
 *   con emojis por tema, como las pestañas del teclado del celular. Un clic
 *   lo elige y cierra el panel.
 */
export function SelectorEmoji({
  valor,
  alCambiar,
  id,
}: {
  valor: string | null;
  alCambiar: (emoji: string | null) => void;
  /** Para el rótulo del campo y el panel. */
  id: string;
}) {
  // En el servidor no se sabe: se dibuja el de PC y, si es un celular, se
  // cambia al hidratar.
  const tactil = useSyncExternalStore(
    suscribirseATactil,
    () => window.matchMedia(CONSULTA_TACTIL).matches,
    () => false
  );
  const [abierto, setAbierto] = useState(false);
  // El panel arranca en el tema del emoji elegido, si está en alguno.
  const [tema, setTema] = useState(() =>
    Math.max(0, CATEGORIAS_DE_EMOJI.findIndex((c) => valor !== null && c.emojis.includes(valor)))
  );
  const actual = CATEGORIAS_DE_EMOJI[tema];

  const elegido = (
    <span
      aria-live="polite"
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${
        valor ? "bg-superficie-alta" : "border border-borde text-xs text-tenue"
      }`}
    >
      {valor ?? <span aria-hidden>—</span>}
      <span className="sr-only">{valor ? `Emoji elegido: ${valor}` : "Sin emoji"}</span>
    </span>
  );

  const quitar = valor && (
    <button type="button" onClick={() => alCambiar(null)} className="boton-mini -ml-2.5 mt-0.5">
      Quitar
    </button>
  );

  if (tactil) {
    return (
      <div className="flex items-center gap-3">
        <label htmlFor={id} className="sr-only">
          {valor ? "Cambiar el emoji" : "Elegir un emoji"}
        </label>
        <input
          id={id}
          type="text"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value=""
          placeholder="+"
          aria-describedby={`${id}-ayuda`}
          onChange={(e) => {
            const emoji = ultimoEmoji(e.target.value);
            if (emoji) alCambiar(emoji);
          }}
          className="h-12 w-12 shrink-0 cursor-pointer rounded-xl border border-dashed border-borde-fuerte bg-fondo text-center text-2xl text-transparent caret-transparent transition-colors placeholder:text-suave hover:border-texto/60 focus:border-solid focus:border-foco focus:outline-none"
        />

        {/* El elegido, en su propio cuadrado. */}
        {elegido}

        <div className="min-w-0">
          <p id={`${id}-ayuda`} className="text-xs leading-snug text-tenue">
            Tocá + y elegí uno desde el teclado de emojis.
          </p>
          {quitar}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-controls={`${id}-panel`}
          aria-label={abierto ? "Cerrar los emojis" : valor ? "Cambiar el emoji" : "Elegir un emoji"}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-2xl transition-colors ${
            abierto
              ? "border-foco bg-superficie-alta text-texto"
              : "border-dashed border-borde-fuerte bg-fondo text-suave hover:border-texto/60 hover:text-texto"
          }`}
        >
          <span aria-hidden className={`transition-transform duration-200 ${abierto ? "rotate-45" : ""}`}>
            +
          </span>
        </button>

        {elegido}

        <div className="min-w-0">
          <p className="text-xs leading-snug text-tenue">Hacé clic en + para elegir uno.</p>
          {quitar}
        </div>
      </div>

      {abierto && (
        <div
          id={`${id}-panel`}
          className="desplegar overflow-hidden rounded-2xl border border-borde bg-fondo"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              // Escape cierra el panel, no el diálogo que lo contiene.
              e.stopPropagation();
              e.preventDefault();
              setAbierto(false);
            }
          }}
        >
          {/* Los temas, como las pestañas del teclado de emojis. */}
          <div role="tablist" aria-label="Temas" className="flex gap-1 overflow-x-auto border-b border-borde px-2 py-1.5">
            {CATEGORIAS_DE_EMOJI.map((c, i) => (
              <button
                key={c.nombre}
                type="button"
                role="tab"
                aria-selected={i === tema}
                aria-label={c.nombre}
                title={c.nombre}
                onClick={() => setTema(i)}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg transition-[background-color,opacity] ${
                  i === tema ? "bg-superficie-alta" : "opacity-55 hover:opacity-100"
                }`}
              >
                {c.icono}
              </button>
            ))}
          </div>

          <p className="px-3 pt-2.5 text-xs font-medium text-tenue">{actual.nombre}</p>
          <div
            role="tabpanel"
            aria-label={actual.nombre}
            className="grid max-h-52 grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-0.5 overflow-y-auto p-2"
          >
            {actual.emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  alCambiar(emoji);
                  setAbierto(false);
                }}
                aria-pressed={valor === emoji}
                className={`flex aspect-square items-center justify-center rounded-lg text-2xl transition-colors ${
                  valor === emoji ? "bg-superficie-alta ring-2 ring-foco" : "hover:bg-superficie-alta"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
