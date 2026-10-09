import { formatMoney } from "@/lib/format";

export type TotalCategoria = { name: string; color: string; UYU: number; USD: number };

const MONEDAS = ["UYU", "USD"] as const;
type Moneda = (typeof MONEDAS)[number];
const NOMBRE_MONEDA: Record<Moneda, string> = { UYU: "Pesos", USD: "Dólares" };
const COLOR_MONEDA: Record<Moneda, string> = { UYU: "var(--peso)", USD: "var(--dolar)" };

/**
 * Las categorías de un período, ordenadas de mayor a menor, con una barra que
 * muestra qué parte del total se llevó cada una. Lo usan el dashboard, el
 * resumen mensual y el anual, así las tres páginas se ven igual.
 *
 * Cada moneda va en su propio bloque con su propio 100%. Antes convivían en una
 * sola lista y el porcentaje engañaba: una categoría de US$ 45 aparecía al 78%
 * justo al lado de una de $ 1.650 al 3%, porque se medían contra totales
 * distintos. Si el período tiene una sola moneda, el encabezado no se dibuja.
 */
export function ListaCategorias({
  categorias,
  totales,
  antes,
}: {
  categorias: TotalCategoria[];
  totales: { UYU: number; USD: number };
  /**
   * Lo que gastó cada categoría en el período anterior, por nombre. Cuando
   * viene, cada fila muestra cuánto se movió.
   *
   * El dato vive en la fila y no en una sección aparte: antes había un bloque
   * "Qué cambió" que solo mostraba la que más subió y la que más bajó, y
   * obligaba a cruzarlo mentalmente con esta lista.
   */
  antes?: Map<string, { UYU: number; USD: number }>;
}) {
  const grupos = MONEDAS.map((moneda) => ({
    moneda,
    filas: categorias
      .filter((cat) => cat[moneda] > 0)
      .map((cat) => ({
        name: cat.name,
        color: cat.color,
        monto: cat[moneda],
        porcentaje: totales[moneda] > 0 ? (cat[moneda] / totales[moneda]) * 100 : 0,
        antes: antes?.get(cat.name)?.[moneda] ?? null,
      }))
      .sort((a, b) => b.monto - a.monto),
  })).filter((grupo) => grupo.filas.length > 0);

  if (grupos.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {grupos.map(({ moneda, filas }) => (
        <div key={moneda}>
          {/* Con una sola moneda el encabezado no aporta: el símbolo ya está en
              cada monto. */}
          {grupos.length > 1 && (
            <p className="rotulo mb-2" style={{ color: COLOR_MONEDA[moneda] }}>
              {NOMBRE_MONEDA[moneda]}
            </p>
          )}

          <ul className="lista">
            {filas.map((fila) => (
              <li key={fila.name} className="fila relative gap-3 py-2.5 pl-4 pr-4">
                {/* El filete de color: es lo que identifica la categoría en el
                    celular, donde la barra no entra. */}
                <span aria-hidden className="filete" style={{ backgroundColor: fila.color }} />

                <span className="min-w-0 flex-1 truncate text-sm text-texto">{fila.name}</span>

                <span
                  aria-hidden
                  className="hidden h-[5px] w-24 shrink-0 overflow-hidden rounded-full bg-borde sm:block"
                >
                  {/* max() para que una categoría de 1% siga siendo visible y no
                      se vuelva una barra de cero píxeles. */}
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `max(3px, ${fila.porcentaje}%)`,
                      backgroundColor: fila.color,
                    }}
                  />
                </span>

                {/* Con la columna de cambio a la derecha no entran los dos en
                    un celular: se cortaban los nombres de categoría. Cede el
                    porcentaje, que es el dato menos accionable de la fila y
                    que el orden descendente ya insinúa. En PC van los dos. */}
                <span
                  className={`monto w-10 shrink-0 text-right text-xs text-tenue ${
                    antes ? "hidden sm:inline-block" : ""
                  }`}
                  title={`${Math.round(fila.porcentaje)}% de lo gastado en ${NOMBRE_MONEDA[moneda].toLowerCase()}`}
                >
                  {Math.round(fila.porcentaje)}%
                </span>

                {/* Ancho fijo: si cada monto se ajustara a su largo, las barras y
                    los porcentajes de cada fila terminarían en lugares distintos. */}
                <span className="monto w-28 shrink-0 text-right text-sm text-texto sm:w-32">
                  {formatMoney(fila.monto, moneda)}
                </span>

                {antes && (
                  <span className="monto w-16 shrink-0 pl-2 text-right text-xs text-suave">
                    <Cambio ahora={fila.monto} antes={fila.antes} />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * Cuánto se movió una categoría contra el período anterior.
 *
 * La flecha y el signo hacen el trabajo; el color no se usa para la dirección
 * porque en esta app el verde ya significa "dólares".
 */
function Cambio({ ahora, antes }: { ahora: number; antes: number | null }) {
  // Sin monto en el período anterior la categoría es nueva; un porcentaje
  // contra cero no significa nada.
  if (antes === null || antes === 0) return <span>nuevo</span>;

  const pct = Math.round(((ahora - antes) / antes) * 100);
  if (pct === 0) return <span>=</span>;

  return (
    <>
      <span aria-hidden>{pct > 0 ? "▲" : "▼"} </span>
      <span className="sr-only">{pct > 0 ? "subió " : "bajó "}</span>
      {Math.abs(pct)}%
    </>
  );
}
