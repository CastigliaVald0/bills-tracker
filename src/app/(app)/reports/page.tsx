import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { redirect } from "next/navigation";
import { formatMoney, monthShortLabel } from "@/lib/format";

function Bar({ value, max, color }: { value: number; max: number; color?: string }) {
  const widthPct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 3 : 0) : 0;
  return (
    <div className="h-2.5 shrink-0 grow overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div
        className={color ? "h-full rounded-full" : "h-full rounded-full bg-[#2a78d6] dark:bg-[#3987e5]"}
        style={color ? { width: `${widthPct}%`, backgroundColor: color } : { width: `${widthPct}%` }}
      />
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Resumen anual</h1>
          <p className="text-sm text-slate-500">Total gastado y en qué se fue, mes a mes.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/reports?year=${year - 1}`}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-500 hover:text-slate-900 dark:border-slate-800 dark:hover:text-slate-100"
            aria-label="Año anterior"
          >
            ←
          </Link>
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{year}</span>
          <Link
            href={`/reports?year=${year + 1}`}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-500 hover:text-slate-900 dark:border-slate-800 dark:hover:text-slate-100"
            aria-label="Año siguiente"
          >
            →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500">Total del año en pesos</p>
          <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
            {formatMoney(yearTotals.UYU, "UYU")}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500">Total del año en dólares</p>
          <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
            {formatMoney(yearTotals.USD, "USD")}
          </p>
        </div>
      </div>

      {!hasExpenses ? (
        <p className="text-sm text-slate-500">No hay gastos cargados en {year}.</p>
      ) : (
        <>
          <div>
            <h2 className="mb-3 text-sm font-medium text-slate-900 dark:text-slate-100">Por mes (pesos)</h2>
            <div className="flex flex-col gap-2">
              {monthlyTotals.map((month, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-8 shrink-0 text-xs capitalize text-slate-500">{monthShortLabel(i)}</span>
                  <Bar value={month.UYU} max={maxMonthUYU} />
                  <span className="w-24 shrink-0 text-right text-xs tabular-nums text-slate-700 dark:text-slate-300">
                    {month.UYU > 0 ? formatMoney(month.UYU, "UYU") : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {maxMonthUSD > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-medium text-slate-900 dark:text-slate-100">Por mes (dólares)</h2>
              <div className="flex flex-col gap-2">
                {monthlyTotals.map((month, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-8 shrink-0 text-xs capitalize text-slate-500">{monthShortLabel(i)}</span>
                    <Bar value={month.USD} max={maxMonthUSD} />
                    <span className="w-24 shrink-0 text-right text-xs tabular-nums text-slate-700 dark:text-slate-300">
                      {month.USD > 0 ? formatMoney(month.USD, "USD") : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-3 text-sm font-medium text-slate-900 dark:text-slate-100">
              A qué corresponde el gasto del año
            </h2>
            <div className="flex flex-col gap-3">
              {categoryTotals.map((cat) => (
                <div key={cat.name} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </span>
                    <span className="text-slate-900 dark:text-slate-100">
                      {cat.UYU > 0 && <span>{formatMoney(cat.UYU, "UYU")}</span>}
                      {cat.UYU > 0 && cat.USD > 0 && <span className="mx-1 text-slate-400">·</span>}
                      {cat.USD > 0 && <span>{formatMoney(cat.USD, "USD")}</span>}
                    </span>
                  </div>
                  {cat.UYU > 0 && <Bar value={cat.UYU} max={maxCategoryUYU} color={cat.color} />}
                  {cat.UYU === 0 && cat.USD > 0 && <Bar value={cat.USD} max={maxCategoryUSD} color={cat.color} />}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
