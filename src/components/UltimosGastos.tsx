import Link from "next/link";
import { formatMoney } from "@/lib/format";

export type GastoReciente = {
  id: string;
  /** Fecha del gasto (00:00 UTC del día elegido). */
  fecha: Date;
  monto: number;
  moneda: "UYU" | "USD";
  descripcion: string | null;
  categoria: { nombre: string; color: string };
  fijo: boolean;
};

type Dia = { clave: string; fecha: Date; gastos: GastoReciente[] };

const DIA_EN_MS = 24 * 60 * 60 * 1000;

/**
 * Los últimos gastos como una tira de ticket de caja.
 *
 * Es la contracara de la pizarra: la pizarra es la tinta donde se publican los
 * totales, el ticket es el papel que te queda de cada compra. Sus colores
 * siguen el tema claro u oscuro de la app (ver .ticket en globals.css).
 *
 * Cada día es un tramo de la tira, separado del anterior por una línea de
 * corte; cada gasto, un renglón con los puntos que llevan el ojo hasta el
 * monto, como en cualquier ticket.
 *
 * `hoy` es la fecha de hoy en Uruguay a las 00:00 UTC, igual que se guardan
 * las fechas de los gastos, para poder compararlas sin corrimientos de zona.
 */
export function UltimosGastos({
  gastos,
  hoy,
  totalDelMes,
}: {
  gastos: GastoReciente[];
  hoy: Date;
  /** Cuántos gastos tiene el mes en total; la tira muestra solo los últimos. */
  totalDelMes: number;
}) {
  // Vienen ordenados del más nuevo al más viejo: los del mismo día quedan juntos.
  const dias: Dia[] = [];
  for (const gasto of gastos) {
    const clave = gasto.fecha.toISOString().slice(0, 10);
    let dia = dias[dias.length - 1];
    if (!dia || dia.clave !== clave) {
      dia = { clave, fecha: gasto.fecha, gastos: [] };
      dias.push(dia);
    }
    dia.gastos.push(gasto);
  }

  // "vie 09 oct": sin los puntos de abreviatura, que en mayúsculas ensucian.
  const fechaDeTicket = (fecha: Date) =>
    new Intl.DateTimeFormat("es-UY", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    })
      .format(fecha)
      .replace(/[.,]/g, "");

  function cercania(fecha: Date) {
    const distancia = Math.round((hoy.getTime() - fecha.getTime()) / DIA_EN_MS);
    return distancia === 0 ? "Hoy" : distancia === 1 ? "Ayer" : null;
  }

  return (
    <div className="ticket mx-auto w-full max-w-md">
      {dias.map((dia) => (
        <section key={dia.clave} className="ticket-tramo px-4 py-3.5 sm:px-5">
          <h3 className="ticket-renglon flex items-baseline justify-between gap-3">
            <span>{fechaDeTicket(dia.fecha)}</span>
            {cercania(dia.fecha) && <span>{cercania(dia.fecha)}</span>}
          </h3>

          <ul className="mt-2.5 flex flex-col gap-2.5">
            {dia.gastos.map((gasto) => (
              <li key={gasto.id}>
                <div className="flex items-baseline gap-2">
                  <span
                    aria-hidden
                    className="h-2 w-2 shrink-0 translate-y-[-1px] rounded-full"
                    style={{ backgroundColor: gasto.categoria.color }}
                  />
                  <span className="min-w-0 truncate text-sm font-medium">
                    {gasto.descripcion || gasto.categoria.nombre}
                  </span>
                  <span aria-hidden className="ticket-puntos" />
                  <span
                    className="monto shrink-0 text-sm"
                    style={{
                      color: gasto.moneda === "UYU" ? "var(--ticket-peso)" : "var(--ticket-dolar)",
                    }}
                  >
                    {formatMoney(gasto.monto, gasto.moneda)}
                  </span>
                </div>
                {(gasto.descripcion || gasto.fijo) && (
                  <p className="ticket-renglon mt-1 truncate pl-4">
                    {[gasto.descripcion && gasto.categoria.nombre, gasto.fijo && "fijo"]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="ticket-pie flex items-baseline justify-between gap-3 px-4 pt-3.5 pb-4 sm:px-5">
        <span className="ticket-renglon">
          {gastos.length < totalDelMes
            ? `Últimos ${gastos.length} de ${totalDelMes}`
            : `${totalDelMes} ${totalDelMes === 1 ? "gasto" : "gastos"} este mes`}
        </span>
        <Link href="/monthly" className="ticket-renglon ticket-enlace">
          Ver todo el mes <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
