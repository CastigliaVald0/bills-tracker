import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { redirect } from "next/navigation";
import { formatMoney, currentMonth, monthLabel } from "@/lib/format";
import { BrouLink } from "@/components/BrouLink";
import { Pizarra } from "@/components/Pizarra";

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
    <div className="flex flex-col gap-8">
      <Pizarra
        rotulo="Gastado este mes"
        titulo={monthLabel(month)}
        accion={<BrouLink />}
        pesos={formatMoney(totals.UYU, "UYU")}
        dolares={formatMoney(totals.USD, "USD")}
      />

      <section>
        <h2 className="rotulo mb-3">Por categoría</h2>
        {categoryTotals.length === 0 ? (
          <p className="tarjeta px-4 py-6 text-center text-sm text-suave">
            Todavía no cargaste gastos este mes.
          </p>
        ) : (
          <div className="lista">
            {categoryTotals.map((cat) => (
              <div key={cat.name} className="fila">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="punto" style={{ backgroundColor: cat.color }} />
                  <span className="truncate text-sm text-texto">{cat.name}</span>
                </div>
                <div className="monto shrink-0 text-sm text-texto">
                  {cat.UYU > 0 && <span>{formatMoney(cat.UYU, "UYU")}</span>}
                  {cat.UYU > 0 && cat.USD > 0 && <span className="mx-1.5 text-tenue">·</span>}
                  {cat.USD > 0 && <span>{formatMoney(cat.USD, "USD")}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="rotulo mb-3">Últimos gastos</h2>
        {expenses.length === 0 ? (
          <p className="tarjeta px-4 py-6 text-center text-sm text-suave">
            Nada cargado todavía.
          </p>
        ) : (
          <div className="lista">
            {expenses.slice(0, 8).map((expense) => (
              <div key={expense.id} className="fila">
                <div className="min-w-0">
                  <p className="truncate text-sm text-texto">
                    {expense.description || expense.category.name}
                  </p>
                  <p className="rotulo mt-1 truncate normal-case tracking-normal">
                    {new Intl.DateTimeFormat("es-UY", { day: "2-digit", month: "short" }).format(expense.date)} ·{" "}
                    {expense.category.name}
                  </p>
                </div>
                <span className="monto shrink-0 text-sm text-texto">
                  {formatMoney(expense.amount.toString(), expense.currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
