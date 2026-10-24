import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { Insignia } from "@/components/Insignia";

export type GastoReciente = {
  id: string;
  /** Fecha del gasto (00:00 UTC del día elegido). */
  fecha: Date;
  monto: number;
  moneda: "UYU" | "USD";
  descripcion: string | null;
  categoria: { nombre: string; color: string; emoji?: string | null };
  fijo: boolean;
  /** El nombre del grupo, si el gasto se cargó dentro de uno. */
  grupo?: string | null;
};

const DIA_EN_MS = 24 * 60 * 60 * 1000;

/**
 * Los últimos gastos del mes, en filas compactas: la insignia de la categoría,
 * qué fue y, a la derecha, el monto en el color de su moneda con el día
 * chiquito debajo ("Hoy", "Ayer", "lun 19"). Antes iban agrupados bajo fajas
 * por día, que cortaban la lista y pesaban más que los propios gastos.
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
  /** Cuántos gastos tiene el mes en total; acá se muestran solo los últimos. */
  totalDelMes: number;
}) {
  function cuando(fecha: Date) {
    const distancia = Math.round((hoy.getTime() - fecha.getTime()) / DIA_EN_MS);
    if (distancia === 0) return "Hoy";
    if (distancia === 1) return "Ayer";
    return new Intl.DateTimeFormat("es-UY", { weekday: "short", day: "numeric", timeZone: "UTC" })
      .format(fecha)
      .replace(".", "")
      .replace(",", "");
  }

  return (
    <section aria-labelledby="ultimos-titulo" className="tarjeta aparece flex min-w-0 flex-col overflow-hidden">
      <header className="panel-cabeza">
        <div className="min-w-0">
          <h2 id="ultimos-titulo" className="panel-titulo">
            Lo último que cargaste
          </h2>
          <p className="panel-dato">
            {totalDelMes} {totalDelMes === 1 ? "gasto" : "gastos"} este mes
          </p>
        </div>
        <Link href="/monthly" className="panel-enlace">
          Ver todos <span aria-hidden>→</span>
        </Link>
      </header>

      <ul className="panel-filas">
        {gastos.map((gasto) => (
          <li key={gasto.id} className="panel-fila">
            <Insignia nombre={gasto.categoria.nombre} color={gasto.categoria.color} emoji={gasto.categoria.emoji} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-texto">{gasto.descripcion || gasto.categoria.nombre}</p>
              <p className="mt-0.5 truncate text-xs text-tenue">
                {[gasto.categoria.nombre, gasto.fijo && "Fijo", gasto.grupo && gasto.grupo].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className={`monto text-sm font-semibold ${gasto.moneda === "UYU" ? "text-peso" : "text-dolar"}`}>
                {formatMoney(gasto.monto, gasto.moneda)}
              </p>
              <p className="mt-0.5 text-xs text-tenue first-letter:uppercase">{cuando(gasto.fecha)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
