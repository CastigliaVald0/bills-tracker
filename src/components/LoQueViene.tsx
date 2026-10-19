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
 * "cómo viene el mes".
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

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h2 className="seccion-titulo px-1">Lo que viene</h2>

      <div className="tarjeta aparece flex flex-col overflow-hidden">
        {pendientes.length === 0 ? (
          <p className="px-4 py-4 text-sm leading-relaxed text-suave">
            No te queda ningún gasto fijo por pagar en {nombreMes}.
          </p>
        ) : (
          <>
            <ul className="lista rounded-none border-0 bg-transparent shadow-none">
              {pendientes.map((p) => {
                const dias = p.dia - hoy;
                return (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                    {/* el día en que cae, como la hoja de un almanaque */}
                    <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-fondo/70 ring-1 ring-borde">
                      <span className="monto text-[15px] font-semibold leading-none text-texto">{p.dia}</span>
                      <span className="mt-0.5 h-[3px] w-3 rounded-full" style={{ backgroundColor: p.color }} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-texto">{p.nombre}</p>
                      <p className="mt-0.5 text-xs text-tenue">
                        {dias === 1 ? "Mañana" : `En ${dias} días`}
                      </p>
                    </div>
                    <span
                      className={`monto shrink-0 text-sm font-medium ${
                        p.moneda === "UYU" ? "text-peso" : "text-dolar"
                      }`}
                    >
                      {formatMoney(p.monto, p.moneda)}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-baseline justify-between gap-3 border-t border-borde bg-fondo/35 px-4 py-3">
              <span className="text-sm text-suave">Falta pagar</span>
              <span className="monto flex flex-col items-end text-sm font-semibold text-texto">
                {falta.UYU > 0 && <span>{formatMoney(falta.UYU, "UYU")}</span>}
                {falta.USD > 0 && <span>{formatMoney(falta.USD, "USD")}</span>}
              </span>
            </div>
          </>
        )}

        <Link
          href="/recurring"
          className="mt-auto flex items-center justify-center gap-1.5 border-t border-borde py-3.5 text-sm font-medium text-suave transition-colors hover:bg-superficie-alta hover:text-texto"
        >
          Ver gastos fijos <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
