import { formatMoney } from "@/lib/format";

export type TotalCategoria = { name: string; color: string; UYU: number; USD: number };

/**
 * Bloques de categorías con su monto y porcentaje. Lo usan el resumen anual y el
 * mensual, así las dos páginas se ven igual.
 *
 * El porcentaje se mide en la moneda principal de cada categoría: pesos si
 * tiene, dólares si solo gastó en dólares. Las dos monedas no se suman, así que
 * cada una tiene su propio 100%.
 */
export function ListaCategorias({
  categorias,
  totales,
}: {
  categorias: TotalCategoria[];
  totales: { UYU: number; USD: number };
}) {
  return (
    <ul className="flex flex-col gap-2.5">
      {categorias.map((cat) => {
        const moneda = cat.UYU > 0 ? "UYU" : "USD";
        const monto = moneda === "UYU" ? cat.UYU : cat.USD;
        const total = totales[moneda];
        const porcentaje = total > 0 ? Math.round((monto / total) * 100) : 0;

        return (
          <li
            key={cat.name}
            className="flex items-center gap-3 rounded-md border border-borde bg-superficie px-3 py-2.5"
          >
            {/* Hace de "logo": el color de la categoría sobre un fondo tenue de
                ese mismo color. */}
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
              style={{ backgroundColor: `color-mix(in srgb, ${cat.color} 18%, transparent)` }}
            >
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: cat.color }} />
            </span>

            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-texto sm:text-base">
              {cat.name}
            </span>

            <span className="flex shrink-0 flex-col items-end">
              <span className="monto text-sm text-texto">{formatMoney(monto, moneda)}</span>
              {moneda === "UYU" && cat.USD > 0 && (
                <span className="monto text-xs text-suave">+ {formatMoney(cat.USD, "USD")}</span>
              )}
            </span>

            <span
              // Ancho fijo: si la etiqueta se ajusta al número (4% vs 47%), los
              // montos de cada fila terminan en lugares distintos.
              className="monto w-11 shrink-0 rounded-sm border border-borde bg-superficie-alta py-0.5 text-center text-xs text-suave"
              title={`${porcentaje}% de lo gastado en ${moneda === "UYU" ? "pesos" : "dólares"}`}
            >
              {porcentaje}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}
