import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { redirect } from "next/navigation";
import { formatMoney, currentMonth, monthLabel } from "@/lib/format";
import { BrouLink } from "@/components/BrouLink";
import { Pizarra } from "@/components/Pizarra";
import { ListaCategorias } from "@/components/ListaCategorias";
import { Vacio, IconoTicket } from "@/components/Vacio";

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
  const byCategory = new Map<
    string,
    { name: string; color: string; UYU: number; USD: number }
  >();

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

  // Sin ordenar: ListaCategorias arma un bloque por moneda y ordena cada uno
  // por su propio monto.
  const categoryTotals = Array.from(byCategory.values());

  return (
    <div className="flex flex-col gap-8">
      <Pizarra
        rotulo="Gastado este mes"
        titulo={monthLabel(month)}
        accion={<BrouLink />}
        pesos={formatMoney(totals.UYU, "UYU")}
        dolares={formatMoney(totals.USD, "USD")}
      />

      {/* Un solo bloque en vez de dos cajas vacías seguidas: sin gastos, "Por
          categoría" y "Últimos gastos" decían lo mismo y la página arrancaba
          pareciendo rota. */}
      {expenses.length === 0 ? (
        <Vacio
          icono={<IconoTicket />}
          titulo="Todavía no hay nada este mes"
          detalle="Cargá tu primer gasto y acá vas a ver en qué se te va el mes, por categoría y con cada moneda por separado."
          accion={{ href: "/expenses", texto: "Cargar un gasto" }}
        />
      ) : (
        <>
          <section>
            <h2 className="rotulo mb-3">Por categoría</h2>
            <ListaCategorias categorias={categoryTotals} totales={totals} />
          </section>

          <section>
            <h2 className="rotulo mb-3">Últimos gastos</h2>
            <div className="lista">
              {expenses.slice(0, 8).map((expense) => (
                <div key={expense.id} className="fila">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-texto">
                      {expense.description || expense.category.name}
                    </p>
                    <p className="rotulo mt-1 truncate normal-case tracking-normal">
                      {new Intl.DateTimeFormat("es-UY", {
                        day: "2-digit",
                        month: "short",
                      }).format(expense.date)}{" "}
                      · {expense.category.name}
                    </p>
                  </div>
                  <span className="monto shrink-0 text-sm text-texto">
                    {formatMoney(expense.amount.toString(), expense.currency)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
