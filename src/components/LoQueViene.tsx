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
    <section className="tarjeta aparece flex flex-col">
      <h2 className="rotulo px-4 pt-4">Lo que viene</h2>

      {pendientes.length === 0 ? (
        <p className="px-4 pt-3 pb-4 text-sm leading-relaxed text-suave">
          No te queda ningún gasto fijo por pagar en {nombreMes}.
        </p>
      ) : (
        <>
          <ul className="mt-3 flex flex-col">
            {pendientes.map((p) => {
              const dias = p.dia - hoy;
              return (
                <li key={p.id} className="flex items-center gap-3 border-t border-borde px-4 py-3">
                  {/* el mismo sello de fecha del calendario: el día en grande */}
                  <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-superficie-alta">
                    <span className="monto text-sm leading-none text-texto">{p.dia}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm text-texto">
                      <span
                        aria-hidden
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="truncate">{p.nombre}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-tenue">
                      {dias === 1 ? "Mañana" : `En ${dias} días`}
                    </p>
                  </div>
                  <span
                    className={`monto shrink-0 text-sm ${
                      p.moneda === "UYU" ? "text-peso" : "text-dolar"
                    }`}
                  >
                    {formatMoney(p.monto, p.moneda)}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="flex items-baseline justify-between gap-3 border-t border-borde px-4 py-3">
            <span className="rotulo">Falta pagar</span>
            <span className="monto flex flex-col items-end text-sm text-texto">
              {falta.UYU > 0 && <span>{formatMoney(falta.UYU, "UYU")}</span>}
              {falta.USD > 0 && <span>{formatMoney(falta.USD, "USD")}</span>}
            </span>
          </div>
        </>
      )}

      <Link
        href="/recurring"
        className="rotulo mt-auto flex items-center justify-center gap-1.5 border-t border-borde py-3 transition-colors hover:text-texto"
      >
        Gastos fijos <span aria-hidden>→</span>
      </Link>
    </section>
  );
}
