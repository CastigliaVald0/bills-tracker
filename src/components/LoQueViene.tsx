import Link from "next/link";
import { formatMoney } from "@/lib/format";

export type FijoPendiente = {
  id: string;
  dia: number;
  monto: number;
  moneda: "UYU" | "USD";
  nombre: string;
  color: string;
};

/**
 * Los gastos fijos que todavía no cayeron este mes. El total de la pizarra
 * dice lo que ya gastaste; esto dice lo que falta, que es la otra mitad de
 * "cómo viene el mes". Cada uno lleva su día como la hoja de un almanaque,
 * con el color de su categoría debajo del número.
 */
export function LoQueViene({
  pendientes,
  hoy,
  nombreMes,
}: {
  pendientes: FijoPendiente[];
  /** El día de hoy (1-31). */
  hoy: number;
  /** "octubre" */
  nombreMes: string;
}) {
  const falta = { UYU: 0, USD: 0 };
  for (const p of pendientes) falta[p.moneda] += p.monto;
  const textoFalta = [falta.UYU > 0 && formatMoney(falta.UYU, "UYU"), falta.USD > 0 && formatMoney(falta.USD, "USD")]
    .filter(Boolean)
    .join(" · ");

  return (
    <section aria-labelledby="viene-titulo" className="tarjeta aparece flex min-w-0 flex-col overflow-hidden">
      <header className="panel-cabeza">
        <div className="min-w-0">
          <h2 id="viene-titulo" className="panel-titulo">
            Lo que viene
          </h2>
          <p className="panel-dato">
            {pendientes.length === 0 ? (
              `Nada más en ${nombreMes}`
            ) : (
              <>
                Falta pagar <span className="monto text-texto">{textoFalta}</span>
              </>
            )}
          </p>
        </div>
        <Link href="/expenses?ver=fijos" className="panel-enlace">
          Fijos <span aria-hidden>→</span>
        </Link>
      </header>

      {pendientes.length === 0 ? (
        <p className="px-4 py-5 text-sm leading-relaxed text-suave">
          No te queda ningún gasto fijo por pagar en {nombreMes}.
        </p>
      ) : (
        <ul className="panel-filas">
          {pendientes.map((p) => {
            const dias = p.dia - hoy;
            return (
              <li key={p.id} className="panel-fila">
                <span className="almanaque" aria-hidden>
                  <span className="monto">{p.dia}</span>
                  <span className="almanaque-color" style={{ backgroundColor: p.color }} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-texto">{p.nombre}</p>
                  <p className="mt-0.5 text-xs text-tenue">
                    <span className="sr-only">Día {p.dia}, </span>
                    {dias === 1 ? "Mañana" : `En ${dias} días`}
                  </p>
                </div>
                <span
                  className={`monto shrink-0 text-sm font-semibold ${p.moneda === "UYU" ? "text-peso" : "text-dolar"}`}
                >
                  {formatMoney(p.monto, p.moneda)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
