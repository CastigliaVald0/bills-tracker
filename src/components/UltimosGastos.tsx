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

type Dia = { clave: string; fecha: Date; gastos: GastoReciente[] };

const DIA_EN_MS = 24 * 60 * 60 * 1000;

/**
 * Los últimos gastos, agrupados por día: "Hoy", "Ayer" y después el nombre del
 * día. Cada gasto lleva la insignia de su categoría y el monto en el color de
 * su moneda, como en el resto de la app.
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

  // "Viernes 16 de octubre", o "Hoy" / "Ayer" cuando corresponde.
  function nombreDelDia(fecha: Date) {
    const distancia = Math.round((hoy.getTime() - fecha.getTime()) / DIA_EN_MS);
    if (distancia === 0) return "Hoy";
    if (distancia === 1) return "Ayer";
    const texto = new Intl.DateTimeFormat("es-UY", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    })
      .format(fecha)
      .replace(",", "");
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 className="seccion-titulo">Lo último que cargaste</h2>
        <span className="text-xs text-tenue">
          {gastos.length < totalDelMes
            ? `${gastos.length} de ${totalDelMes}`
            : `${totalDelMes} ${totalDelMes === 1 ? "gasto" : "gastos"}`}
        </span>
      </div>

      <div className="tarjeta aparece overflow-hidden">
        {dias.map((dia) => {
          const sumaDia = { UYU: 0, USD: 0 };
          for (const g of dia.gastos) sumaDia[g.moneda] += g.monto;
          return (
            <div key={dia.clave} className="border-b border-borde/70 last:border-b-0">
              <h3 className="flex items-baseline justify-between gap-3 bg-fondo/35 px-4 py-2 text-xs font-medium text-suave">
                <span>{nombreDelDia(dia.fecha)}</span>
                <span className="monto text-tenue">
                  {[
                    sumaDia.UYU > 0 && formatMoney(sumaDia.UYU, "UYU"),
                    sumaDia.USD > 0 && formatMoney(sumaDia.USD, "USD"),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </h3>

              <ul className="lista rounded-none border-0 bg-transparent shadow-none">
                {dia.gastos.map((gasto) => (
                  <li key={gasto.id} className="flex items-center gap-3 px-4 py-3">
                    <Insignia nombre={gasto.categoria.nombre} color={gasto.categoria.color} emoji={gasto.categoria.emoji} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-texto">
                        {gasto.descripcion || gasto.categoria.nombre}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-tenue">
                        {[
                          gasto.categoria.nombre,
                          gasto.fijo && "Gasto fijo",
                          gasto.grupo && `Grupo ${gasto.grupo}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <span
                      className={`monto shrink-0 text-[15px] font-medium ${
                        gasto.moneda === "UYU" ? "text-peso" : "text-dolar"
                      }`}
                    >
                      {formatMoney(gasto.monto, gasto.moneda)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        <Link
          href="/monthly"
          className="flex items-center justify-center gap-1.5 border-t border-borde px-4 py-3.5 text-sm font-medium text-suave transition-colors hover:bg-superficie-alta hover:text-texto"
        >
          Ver todos los gastos del mes <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
