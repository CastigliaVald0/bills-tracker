import { formatMoney } from "@/lib/format";

type Moneda = "UYU" | "USD";

/**
 * Lo que me toca a mí de un grupo compartido, en el pie de su pizarra.
 *
 * Arriba, en grande, la pizarra dice lo que gastó el grupo entero; esta fila
 * dice lo que es tuyo, alineada en las mismas dos columnas (pesos a la
 * izquierda, dólares a la derecha), en un tamaño menor. Así lo general y lo
 * individual se leen por separado pero se comparan de un vistazo. Lo tuyo es
 * lo que cuenta en tu mes.
 */
export function ParteEnPizarra({ mia }: { mia: Record<Moneda, number> }) {
  return (
    <div className="grid grid-cols-2 border-t border-pizarra-borde">
      {(["UYU", "USD"] as const).map((moneda, i) => (
        <div key={moneda} className="pizarra-columna relative px-5 py-4 sm:px-7 sm:py-5">
          {/* el mismo filete suelto que separa las columnas de arriba */}
          {i === 1 && <span aria-hidden className="absolute inset-y-3 left-0 w-px bg-pizarra-borde" />}
          <p className="rotulo text-pizarra-suave">Tu parte</p>
          <p className="monto mt-1.5 text-xl leading-none text-pizarra-texto">
            {formatMoney(mia[moneda], moneda)}
          </p>
        </div>
      ))}
    </div>
  );
}
