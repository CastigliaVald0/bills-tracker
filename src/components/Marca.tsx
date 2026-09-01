/**
 * Marca: los dos puntos son las dos monedas que la app nunca suma —
 * el peso en celeste, el dólar en verde. Es el mismo par de colores
 * que traza el filo de la pizarra.
 */
export function Marca({ size = "sm" }: { size?: "sm" | "lg" }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex items-center gap-[3px]" aria-hidden>
        <span className="h-[7px] w-[7px] rounded-full bg-peso" />
        <span className="h-[7px] w-[7px] rounded-full bg-dolar" />
      </span>
      <span
        className={`font-semibold tracking-tight text-texto ${
          size === "lg" ? "text-xl" : "text-[15px]"
        }`}
      >
        Billions Tracker
      </span>
    </span>
  );
}
