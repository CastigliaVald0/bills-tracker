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
 * "cómo viene el mes". Cada uno es una tarjetita con su día grande, el color
 * de su categoría y cuánto falta; el más cercano va en durazno. En el celular
 * se deslizan de costado; en la columna de PC van de a dos.
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

  const mesCorto = nombreMes.slice(0, 3);

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
        // Una tarjetita por fijo, con el día grande. El más cercano va en
        // durazno (ver .vencimientos y .vto en globals.css).
        <ul className="vencimientos" aria-label={`Gastos fijos que faltan en ${nombreMes}`}>
          {pendientes.map((p, n) => {
            const dias = p.dia - hoy;
            const cerca = n === 0;
            return (
              <li
                key={p.id}
                className={`vto ${cerca ? "cerca" : ""}`}
                style={{ "--n": n } as React.CSSProperties}
              >
                <span className="vto-dia">
                  <span className="monto">{p.dia}</span>
                  <small>{mesCorto}</small>
                </span>
                <span aria-hidden className="vto-color" style={{ backgroundColor: p.color }} />
                <span className="vto-nombre">{p.nombre}</span>
                <span className={`monto text-sm font-semibold ${p.moneda === "UYU" ? "text-peso" : "text-dolar"}`}>
                  {formatMoney(p.monto, p.moneda)}
                </span>
                <span className="vto-falta">{dias <= 0 ? "Hoy" : dias === 1 ? "Mañana" : `En ${dias} días`}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
