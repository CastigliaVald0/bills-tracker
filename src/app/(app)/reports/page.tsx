import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { redirect } from "next/navigation";
import { formatMoney } from "@/lib/format";
import { Pizarra } from "@/components/Pizarra";
import { TortaCombinada } from "@/components/TortaCombinada";
import { BarrasMes } from "@/components/BarrasMes";
import { ListaCategorias } from "@/components/ListaCategorias";
import { getUsdRate } from "@/lib/exchange-rate";
import { combinarPorMes } from "@/lib/combinar-monedas";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const userId = await requireUserId();
  if (!userId) redirect("/login");

  const { year: yearParam } = await searchParams;
  const year = yearParam ? Number(yearParam) : new Date().getUTCFullYear();

  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const expenses = await prisma.expense.findMany({
    where: { userId, date: { gte: start, lt: end } },
    include: { category: true },
  });

  const yearTotals = { UYU: 0, USD: 0 };
  const monthlyTotals = Array.from({ length: 12 }, () => ({ UYU: 0, USD: 0 }));
  const byCategory = new Map<string, { name: string; color: string; UYU: number; USD: number }>();

  for (const expense of expenses) {
    const amount = Number(expense.amount);
    const monthIndex = expense.date.getUTCMonth();

    yearTotals[expense.currency] += amount;
    monthlyTotals[monthIndex][expense.currency] += amount;

    const entry = byCategory.get(expense.categoryId) ?? {
      name: expense.category.name,
      color: expense.category.color,
      UYU: 0,
      USD: 0,
    };
    entry[expense.currency] += amount;
    byCategory.set(expense.categoryId, entry);
  }

  const categoryTotals = Array.from(byCategory.values()).sort(
    (a, b) => b.UYU + b.USD * 40 - (a.UYU + a.USD * 40)
  );

  // Los meses que todavía no llegaron no se muestran. En un año pasado se ven
  // los 12; en el año en curso, hasta el mes actual inclusive; en uno futuro,
  // ninguno. Se compara en la hora de Uruguay: el 31 a las 22 hs en Montevideo
  // ya es el mes siguiente en UTC.
  const ahora = new Date();
  const [anioActual, mesActual] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
    year: "numeric",
    month: "numeric",
  })
    .format(ahora)
    .split("-")
    .map(Number);
  const mesesVisibles = year < anioActual ? 12 : year === anioActual ? mesActual : 0;

  const barrasUYU = monthlyTotals
    .slice(0, mesesVisibles)
    .map((m, mes) => ({ mes, monto: m.UYU }));
  const barrasUSD = monthlyTotals
    .slice(0, mesesVisibles)
    .map((m, mes) => ({ mes, monto: m.USD }));
  const hayUSD = barrasUSD.some((b) => b.monto > 0);

  const hasExpenses = expenses.length > 0;

  // Único lugar de la app que suma las dos monedas. Cada gasto en dólares se
  // convierte con la cotización que quedó guardada el día que se cargó, así el
  // pasado no se mueve cuando cambia el dólar. La de hoy solo cubre los gastos
  // que no tienen la suya.
  const cotizacion = await getUsdRate();
  const combinado = cotizacion ? combinarPorMes(expenses, cotizacion.venta) : null;
  const gajosCombinados = combinado
    ? combinado.porMes.map((monto, mes) => ({ mes, monto })).filter((g) => g.monto > 0)
    : [];

  const navAnios = (
    <div className="flex shrink-0 items-center gap-1">
      <Link
        href={`/reports?year=${year - 1}`}
        className="flex h-8 w-8 items-center justify-center rounded border border-pizarra-borde text-pizarra-suave transition-colors hover:border-peso-luz hover:text-pizarra-texto"
        aria-label={`Ir a ${year - 1}`}
      >
        ←
      </Link>
      <span className="monto px-2 text-sm font-light text-pizarra-texto">{year}</span>
      <Link
        href={`/reports?year=${year + 1}`}
        className="flex h-8 w-8 items-center justify-center rounded border border-pizarra-borde text-pizarra-suave transition-colors hover:border-dolar-luz hover:text-pizarra-texto"
        aria-label={`Ir a ${year + 1}`}
      >
        →
      </Link>
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <Pizarra
        rotulo="Gastado en el año"
        titulo="Resumen anual"
        accion={navAnios}
        pesos={formatMoney(yearTotals.UYU, "UYU")}
        dolares={formatMoney(yearTotals.USD, "USD")}
      />

      {!hasExpenses ? (
        <p className="tarjeta px-4 py-8 text-center text-sm text-suave">
          No hay gastos cargados en {year}.
        </p>
      ) : (
        <>
          {mesesVisibles > 0 && (
            <section>
              <h2 className="rotulo mb-3">
                Mes a mes <span className="text-peso">· pesos</span>
              </h2>
              <div className="tarjeta px-2 pt-3 pb-1 sm:px-3">
                <BarrasMes meses={barrasUYU} moneda="UYU" />
              </div>
            </section>
          )}

          {mesesVisibles > 0 && hayUSD && (
            <section>
              <h2 className="rotulo mb-3">
                Mes a mes <span className="text-dolar">· dólares</span>
              </h2>
              <div className="tarjeta px-2 pt-3 pb-1 sm:px-3">
                <BarrasMes meses={barrasUSD} moneda="USD" />
              </div>
            </section>
          )}

          <section>
            <h2 className="rotulo mb-3">Categorías del año</h2>
            <ListaCategorias categorias={categoryTotals} totales={yearTotals} />
          </section>

          <section>
            <h2 className="rotulo mb-3">Todo junto · % por mes</h2>
            {gajosCombinados.length > 0 && cotizacion && combinado ? (
              <TortaCombinada
                datos={gajosCombinados}
                nota={
                  <>
                    Único gráfico que suma pesos y dólares. Cada gasto en dólares se
                    convierte con la cotización del día en que lo cargaste.
                    {combinado.conCotizacionDeHoy > 0 && (
                      <>
                        {" "}
                        {combinado.conCotizacionDeHoy}{" "}
                        {combinado.conCotizacionDeHoy === 1
                          ? "gasto no tiene la suya guardada y usa"
                          : "gastos no tienen la suya guardada y usan"}{" "}
                        la de hoy ({cotizacion.source}, venta {cotizacion.venta}).
                      </>
                    )}
                  </>
                }
              />
            ) : (
              <p className="tarjeta px-4 py-6 text-center text-sm text-suave">
                No se pudo obtener la cotización del dólar, así que no se pueden
                combinar las dos monedas ahora.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
