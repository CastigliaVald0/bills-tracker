"use client";

import { useEffect, useRef, useState } from "react";
import type { Category } from "@/lib/types";
import { Insignia } from "@/components/Insignia";
import { formatMoneyInput } from "@/lib/format";

export type Moneda = "UYU" | "USD";

const MONEDAS: { valor: Moneda; simbolo: string; color: string }[] = [
  { valor: "UYU", simbolo: "$", color: "var(--peso)" },
  { valor: "USD", simbolo: "US$", color: "var(--dolar)" },
];

/**
 * Los controles que comparten el formulario de gasto y el de gasto fijo.
 *
 * Vivían duplicados en las dos páginas y ya habían empezado a separarse. Acá
 * también se corrige lo que tenían en común: el monto pesaba igual que la
 * descripción, la moneda era un desplegable de dos opciones y la categoría
 * perdía su color, que es justo con lo que se la reconoce en todo el resto de
 * la app.
 */

/**
 * Dos o tres opciones excluyentes, resueltas de un toque.
 *
 * Por debajo son radios reales escondidos: el teclado y el lector de pantalla
 * los manejan solos. `color` prende la opción activa en su tinte; sin color se
 * usa el del texto, para los conmutadores que no hablan de dinero.
 */
export function Conmutador<T extends string>({
  nombreGrupo,
  etiqueta,
  opciones,
  valor,
  alCambiar,
}: {
  nombreGrupo: string;
  etiqueta: string;
  opciones: { valor: T; texto: string; color?: string }[];
  valor: T;
  alCambiar: (valor: T) => void;
}) {
  const elegido = opciones.findIndex((o) => o.valor === valor);
  const colorElegido = opciones[elegido]?.color;

  // `--n`, `--i` y `--color` mueven y tiñen la ficha que se desliza debajo de
  // la opción elegida (ver .segmentos en globals.css).
  return (
    <span
      className="segmentos"
      role="group"
      aria-label={etiqueta}
      style={
        {
          "--n": opciones.length,
          "--i": Math.max(elegido, 0),
          ...(colorElegido ? { "--color": colorElegido } : {}),
        } as React.CSSProperties
      }
      data-elegido={elegido >= 0 ? "" : undefined}
    >
      {opciones.map((opcion) => {
        const activo = opcion.valor === valor;
        return (
          <label key={opcion.valor} className="segmento">
            <input
              type="radio"
              name={nombreGrupo}
              value={opcion.valor}
              checked={activo}
              onChange={() => alCambiar(opcion.valor)}
              className="sr-only"
            />
            <span style={activo && opcion.color ? { color: opcion.color } : undefined}>{opcion.texto}</span>
          </label>
        );
      })}
    </span>
  );
}

/** Monto, símbolo y moneda como un solo control. */
export function CampoMonto({
  id,
  idError,
  monto,
  alCambiarMonto,
  moneda,
  alCambiarMoneda,
  nombreGrupo,
}: {
  id: string;
  /** El error del formulario, para enlazarlo con aria-describedby. */
  idError?: string;
  monto: string;
  alCambiarMonto: (valor: string) => void;
  moneda: Moneda;
  alCambiarMoneda: (valor: Moneda) => void;
  /** Distinto por formulario: si no, los dos grupos de radios se pisan. */
  nombreGrupo: string;
}) {
  const actual = MONEDAS.find((m) => m.valor === moneda)!;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="rotulo">
        Monto
      </label>

      <div
        className="campo-monto"
        style={{ "--moneda": actual.color } as React.CSSProperties}
      >
        <span aria-hidden className="campo-monto-simbolo monto shrink-0 text-lg">
          {actual.simbolo}
        </span>

        {/* De texto y no de número: `type="number"` no admite separadores de
            miles, así que $ 18.500 se veía "18500". El formato se aplica en
            cada tecla y `parseMoneyInput` lo deshace al guardar. */}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          value={monto}
          onChange={(e) => alCambiarMonto(formatMoneyInput(e.target.value))}
          aria-describedby={idError}
          aria-invalid={idError ? true : undefined}
          required
          className="monto text-texto"
        />

        <Conmutador
          nombreGrupo={nombreGrupo}
          etiqueta="Moneda"
          valor={moneda}
          alCambiar={alCambiarMoneda}
          opciones={MONEDAS.map((m) => ({ valor: m.valor, texto: m.valor, color: m.color }))}
        />
      </div>
    </div>
  );
}

/**
 * La categoría, como un campo: cerrado muestra solo la elegida (su emoji o su
 * color y el nombre). Al tocarlo sube una hoja propia, encima del formulario,
 * con todas las categorías en una grilla de fichas y "+ Nueva" al final;
 * tocar una la elige y cierra la hoja. Antes eran fichas con todas a la
 * vista (media pantalla) y después una lista que se abría adentro de la
 * ventana y quedaba cortada por sus botones.
 */
export function CampoCategoria({
  categorias,
  valor,
  alCambiar,
  nombreGrupo,
  etiqueta = "Categoría",
  alCrearNueva,
}: {
  categorias: Category[];
  valor: string;
  alCambiar: (id: string) => void;
  nombreGrupo: string;
  etiqueta?: string;
  /** Si viene, al final va "+ Nueva", que la llama (crear sin salir del formulario). */
  alCrearNueva?: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const hoja = useRef<HTMLDialogElement>(null);
  const elegida = categorias.find((c) => c.id === valor) ?? null;

  useEffect(() => {
    if (abierto) hoja.current?.showModal();
  }, [abierto]);

  function cerrar() {
    hoja.current?.close();
    setAbierto(false);
    boton.current?.focus();
  }

  if (categorias.length === 0 && !alCrearNueva) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${nombreGrupo}-rotulo`} className="rotulo">
        {etiqueta}
      </span>

      <button
        ref={boton}
        type="button"
        onClick={() => setAbierto(true)}
        aria-haspopup="dialog"
        aria-labelledby={`${nombreGrupo}-rotulo ${nombreGrupo}-valor`}
        className="campo flex items-center gap-3 text-left"
      >
        {elegida ? (
          <Insignia nombre={elegida.name} color={elegida.color} emoji={elegida.emoji} chica />
        ) : (
          <span aria-hidden className="punto bg-borde-fuerte" />
        )}
        <span id={`${nombreGrupo}-valor`} className={`min-w-0 flex-1 truncate ${elegida ? "text-texto" : "text-tenue"}`}>
          {elegida ? elegida.name : "Elegí una categoría"}
        </span>
        <span aria-hidden className="shrink-0 text-xs font-medium text-tenue">
          Cambiar
        </span>
      </button>

      {abierto && (
        <dialog
          ref={hoja}
          className="dialogo hoja"
          aria-labelledby={`${nombreGrupo}-hoja-titulo`}
          onCancel={(e) => {
            // Escape cierra esta hoja, no el formulario de abajo.
            e.preventDefault();
            e.stopPropagation();
            cerrar();
          }}
          onClick={(e) => {
            // Un toque en el fondo oscuro (fuera de la hoja) la cierra.
            if (e.target === e.currentTarget) cerrar();
          }}
        >
          <div className="flex max-h-[inherit] flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-borde px-5 py-4">
              <h2 id={`${nombreGrupo}-hoja-titulo`} className="seccion-titulo">
                {etiqueta}
              </h2>
              <button type="button" onClick={cerrar} aria-label="Cerrar" className="boton-mini -mr-2">
                <span aria-hidden>✕</span>
              </button>
            </div>

            <div role="radiogroup" aria-label={etiqueta} className="grilla-categorias overflow-y-auto p-4 sm:p-5">
              {categorias.map((cat, i) => {
                const activo = cat.id === valor;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="radio"
                    aria-checked={activo}
                    autoFocus={activo}
                    onClick={() => {
                      alCambiar(cat.id);
                      cerrar();
                    }}
                    className="ficha-categoria"
                    style={{ "--cat": cat.color, "--i": Math.min(i, 12) } as React.CSSProperties}
                  >
                    <Insignia nombre={cat.name} color={cat.color} emoji={cat.emoji} />
                    <span className="ficha-categoria-nombre">{cat.name}</span>
                  </button>
                );
              })}
              {alCrearNueva && (
                <button
                  type="button"
                  onClick={() => {
                    cerrar();
                    alCrearNueva();
                  }}
                  aria-haspopup="dialog"
                  className="ficha-categoria ficha-categoria-nueva"
                  style={{ "--i": Math.min(categorias.length, 12) } as React.CSSProperties}
                >
                  <span aria-hidden className="insignia">+</span>
                  <span className="ficha-categoria-nombre">Nueva</span>
                </button>
              )}
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
