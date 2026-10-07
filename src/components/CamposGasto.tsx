"use client";

import type { Category } from "@/lib/types";
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
  return (
    <span className="segmentos" role="group" aria-label={etiqueta}>
      {opciones.map((opcion) => {
        const activo = opcion.valor === valor;
        const color = opcion.color ?? "var(--texto)";
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
            <span
              style={
                activo
                  ? {
                      backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
                      color,
                    }
                  : undefined
              }
            >
              {opcion.texto}
            </span>
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

/** Categorías como fichas de color en vez de un desplegable. */
export function CampoCategoria({
  categorias,
  valor,
  alCambiar,
  nombreGrupo,
}: {
  categorias: Category[];
  valor: string;
  alCambiar: (id: string) => void;
  nombreGrupo: string;
}) {
  if (categorias.length === 0) return null;

  return (
    <fieldset>
      <legend className="rotulo mb-2">Categoría</legend>

      <div className="flex flex-wrap gap-1.5">
        {categorias.map((cat) => {
          const activo = cat.id === valor;
          return (
            <label key={cat.id} className="ficha">
              <input
                type="radio"
                name={nombreGrupo}
                value={cat.id}
                checked={activo}
                onChange={() => alCambiar(cat.id)}
                className="sr-only"
              />
              <span
                style={
                  activo
                    ? {
                        borderColor: cat.color,
                        backgroundColor: `color-mix(in srgb, ${cat.color} 12%, transparent)`,
                        color: "var(--texto)",
                      }
                    : undefined
                }
              >
                <span aria-hidden className="punto" style={{ backgroundColor: cat.color }} />
                {cat.name}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
