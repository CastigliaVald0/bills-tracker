import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { redirect } from "next/navigation";
import { formatMoney, currentMonth, monthLabel } from "@/lib/format";

export default async function DashboardPage() {
  const userId = await requireUserId();
  if (!userId) redirect("/login");

  const month = currentMonth();
  const [year, mon] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, mon - 1, 1));
  const end = new Date(Date.UTC(year, mon, 1));

  const expenses = await prisma.expense.findMany({
    where: { userId, date: { gte: start, lt: end } },
    include: { category: true },
    orderBy: { date: "desc" },
  });

  const totals = { UYU: 0, USD: 0 };
  const byCategory = new Map<string, { name: string; color: string; UYU: number; USD: number }>();

  for (const expense of expenses) {
    const amount = Number(expense.amount);
    totals[expense.currency] += amount;

    const entry = byCategory.get(expense.categoryId) ?? {
      name: expense.category.name,
      color: expense.category.color,
      UYU: 0,
      USD: 0,
    };
    entry[expense.currency] += amount;
    byCategory.set(expense.categoryId, entry);
  }

  const categoryTotals = Array.from(byCategory.values()).sort((a, b) => b.UYU + b.USD * 40 - (a.UYU + a.USD * 40));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold capitalize text-slate-900 dark:text-slate-100">
          {monthLabel(month)}
        </h1>
        <p className="text-sm text-slate-500">Resumen del mes</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500">Total en pesos</p>
          <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
            {formatMoney(totals.UYU, "UYU")}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500">Total en dólares</p>
          <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
            {formatMoney(totals.USD, "USD")}
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-slate-900 dark:text-slate-100">Por categoría</h2>
        {categoryTotals.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no cargaste gastos este mes.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {categoryTotals.map((cat) => (
              <div
                key={cat.name}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{cat.name}</span>
                </div>
                <div className="text-sm text-slate-900 dark:text-slate-100">
                  {cat.UYU > 0 && <span>{formatMoney(cat.UYU, "UYU")}</span>}
                  {cat.UYU > 0 && cat.USD > 0 && <span className="mx-1 text-slate-400">·</span>}
                  {cat.USD > 0 && <span>{formatMoney(cat.USD, "USD")}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-slate-900 dark:text-slate-100">Últimos gastos</h2>
        {expenses.length === 0 ? (
          <p className="text-sm text-slate-500">Nada cargado todavía.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {expenses.slice(0, 8).map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <p className="text-sm text-slate-900 dark:text-slate-100">
                    {expense.description || expense.category.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Intl.DateTimeFormat("es-UY", { day: "2-digit", month: "short" }).format(expense.date)} ·{" "}
                    {expense.category.name}
                  </p>
                </div>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {formatMoney(expense.amount.toString(), expense.currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
