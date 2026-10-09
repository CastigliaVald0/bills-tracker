import { formatMoney } from "@/lib/format";

type Moneda = "UYU" | "USD";
type Reparto = { fijo: number; variable: number };

const NOMBRE: Record<Moneda, string> = { UYU: "Pesos", USD: "Dólares" };
const LUZ: Record<Moneda, string> = {
  UYU: "var(--peso-luz)",
  USD: "var(--dolar-luz)",
};

/**
 * Cuánto del mes era inevitable y cuánto decidiste vos.
 *
 * La app ya sabía qué gastos vienen de un gasto fijo —lo marcaba con un "·
 * fijo" en cada fila— pero nunca lo sumaba. Es el dato que reencuadra todo lo
 * demás: "Vivienda 59 %" asusta hasta que entendés que es el alquiler, y la
 * parte sobre la que se puede hacer algo es la variable.
 *
 * Solo aparece cuando hay algo fijo que separar. Sin gastos fijos cargados,
 * decir "variables: todo" no aporta nada.
 */
export function RepartoFijos({
  reparto,
  variasMonedas,
}: {
  reparto: Partial<Record<Moneda, Reparto>>;
  /** Con las dos monedas en juego hay que decir de cuál habla cada barra. */
  variasMonedas: boolean;
}) {
  const filas = (Object.entries(reparto) as [Moneda, Reparto][]).filter(
    ([, r]) => r.fijo > 0
  );
  if (filas.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-pizarra-borde px-5 py-4 sm:px-7">
      {filas.map(([moneda, r]) => {
        const total = r.fijo + r.variable;
        const pctFijo = total > 0 ? (r.fijo / total) * 100 : 0;

        // Sin parte variable no hay reparto que dibujar: una barra de un solo
        // segmento no dice nada y, a todo lo ancho, invita a compararla con la
        // de la otra moneda, que está en otra escala.
        if (r.variable === 0) {
          return (
            <p key={moneda} className="text-xs text-pizarra-suave">
              {variasMonedas && `${NOMBRE[moneda]} · `}
              Todo fijo{" "}
              <span className="monto text-pizarra-texto">{formatMoney(r.fijo, moneda)}</span>
            </p>
          );
        }

        return (
          <div key={moneda}>
            {variasMonedas && <p className="rotulo mb-2 text-pizarra-suave">{NOMBRE[moneda]}</p>}

            <span
              aria-hidden
              className="flex h-1.5 w-full overflow-hidden rounded-full bg-pizarra-borde"
            >
              <span
                className="h-full"
                style={{ width: `${pctFijo}%`, backgroundColor: "var(--pizarra-suave)" }}
              />
              <span
                className="h-full"
                style={{ width: `${100 - pctFijo}%`, backgroundColor: LUZ[moneda] }}
              />
            </span>

            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-pizarra-suave">
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: "var(--pizarra-suave)" }}
                />
                Fijos{" "}
                <span className="monto text-pizarra-texto">{formatMoney(r.fijo, moneda)}</span>
              </span>

              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: LUZ[moneda] }}
                />
                Variables{" "}
                <span className="monto text-pizarra-texto">{formatMoney(r.variable, moneda)}</span>
              </span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
