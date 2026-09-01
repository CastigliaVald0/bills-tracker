import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { redirect } from "next/navigation";
import { formatMoney, monthShortLabel } from "@/lib/format";
import { Pizarra } from "@/components/Pizarra";

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const widthPct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 3 : 0) : 0;
  return (
    <div className="barra-pista">
      <div className="barra-valor" style={{ width: `${widthPct}%`, backgroundColor: color }} />
    </div>
  );
}

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

  const maxMonthUYU = Math.max(...monthlyTotals.map((m) => m.UYU), 0);
  const maxMonthUSD = Math.max(...monthlyTotals.map((m) => m.USD), 0);
  const maxCategoryUYU = Math.max(...categoryTotals.map((c) => c.UYU), 0);
  const maxCategoryUSD = Math.max(...categoryTotals.map((c) => c.USD), 0);

  const hasExpenses = expenses.length > 0;

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
          <section>
            <h2 className="rotulo mb-3">
              Mes a mes <span className="text-peso">· pesos</span>
            </h2>
            <div className="tarjeta flex flex-col gap-2.5 p-4">
              {monthlyTotals.map((month, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="rotulo w-8 shrink-0">{monthShortLabel(i).replace(".", "")}</span>
                  <Bar value={month.UYU} max={maxMonthUYU} color="var(--peso)" />
                  <span className="monto w-28 shrink-0 text-right text-xs text-suave">
                    {month.UYU > 0 ? formatMoney(month.UYU, "UYU") : "—"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {maxMonthUSD > 0 && (
            <section>
              <h2 className="rotulo mb-3">
                Mes a mes <span className="text-dolar">· dólares</span>
              </h2>
              <div className="tarjeta flex flex-col gap-2.5 p-4">
                {monthlyTotals.map((month, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="rotulo w-8 shrink-0">{monthShortLabel(i).replace(".", "")}</span>
                    <Bar value={month.USD} max={maxMonthUSD} color="var(--dolar)" />
                    <span className="monto w-28 shrink-0 text-right text-xs text-suave">
                      {month.USD > 0 ? formatMoney(month.USD, "USD") : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="rotulo mb-3">A qué se fue el año</h2>
            <div className="tarjeta flex flex-col gap-4 p-4">
              {categoryTotals.map((cat) => (
                <div key={cat.name} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2.5 text-texto">
                      <span className="punto" style={{ backgroundColor: cat.color }} />
                      <span className="truncate">{cat.name}</span>
                    </span>
                    <span className="monto shrink-0 text-texto">
                      {cat.UYU > 0 && <span>{formatMoney(cat.UYU, "UYU")}</span>}
                      {cat.UYU > 0 && cat.USD > 0 && <span className="mx-1.5 text-tenue">·</span>}
                      {cat.USD > 0 && <span>{formatMoney(cat.USD, "USD")}</span>}
                    </span>
                  </div>
                  {cat.UYU > 0 && <Bar value={cat.UYU} max={maxCategoryUYU} color={cat.color} />}
                  {cat.UYU === 0 && cat.USD > 0 && (
                    <Bar value={cat.USD} max={maxCategoryUSD} color={cat.color} />
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
