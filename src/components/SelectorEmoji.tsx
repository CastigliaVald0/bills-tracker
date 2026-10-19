"use client";

import { ultimoEmoji } from "@/lib/emoji";

/**
 * Elegir el emoji de una categoría o de una sección con el teclado del
 * dispositivo: un cuadrado con "+" que, al tocarlo, abre el teclado (en el
 * celular, con su tecla de emojis; en PC se puede escribir o pegar), y al lado
 * el emoji elegido. Elegir otro reemplaza al anterior; las letras se ignoran.
 *
 * El "+" es un campo de texto de verdad, disfrazado: así el celular abre su
 * teclado sin trucos. Siempre queda vacío; lo escrito se lee y se descarta.
 */
export function SelectorEmoji({
  valor,
  alCambiar,
  id,
}: {
  valor: string | null;
  alCambiar: (emoji: string | null) => void;
  /** Para el rótulo del campo. */
  id: string;
}) {
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
      <span
        aria-live="polite"
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${
          valor ? "bg-superficie-alta" : "border border-borde text-xs text-tenue"
        }`}
      >
        {valor ?? <span aria-hidden>—</span>}
        <span className="sr-only">{valor ? `Emoji elegido: ${valor}` : "Sin emoji"}</span>
      </span>

      <div className="min-w-0">
        <p id={`${id}-ayuda`} className="text-xs leading-snug text-tenue">
          Tocá + y elegí uno desde el teclado de emojis.
        </p>
        {valor && (
          <button type="button" onClick={() => alCambiar(null)} className="boton-mini -ml-2.5 mt-0.5">
            Quitar
          </button>
        )}
      </div>
    </div>
  );
}
