import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { redirect } from "next/navigation";
import { formatMoney, currentMonth, monthLabel } from "@/lib/format";
import { BrouLink } from "@/components/BrouLink";
import { Pizarra } from "@/components/Pizarra";
import { Vacio, IconoTicket } from "@/components/Vacio";
import { UltimosGastos } from "@/components/UltimosGastos";
import { fechaEnUruguay } from "@/lib/monthly-summary";

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
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  // "Hoy" según el reloj de Uruguay, no el del servidor (UTC).
  const hoy = fechaEnUruguay(new Date());

  const totals = { UYU: 0, USD: 0 };
  for (const expense of expenses) totals[expense.currency] += Number(expense.amount);

  return (
    <div className="flex flex-col gap-8">
      <Pizarra
        rotulo="Gastado este mes"
        titulo={monthLabel(month)}
        accion={<BrouLink />}
        pesos={formatMoney(totals.UYU, "UYU")}
        dolares={formatMoney(totals.USD, "USD")}
      />

      {expenses.length === 0 ? (
        <Vacio
          icono={<IconoTicket />}
          titulo="Todavía no hay nada este mes"
          detalle="Cargá tu primer gasto y acá vas a ver lo último que anotaste, día por día y con cada moneda por separado."
          accion={{ href: "/expenses", texto: "Cargar un gasto" }}
        />
      ) : (
        <section>
            <UltimosGastos
              totalDelMes={expenses.length}
              hoy={new Date(Date.UTC(hoy.anio, hoy.mes - 1, hoy.dia))}
              gastos={expenses.slice(0, 8).map((expense) => ({
                id: expense.id,
                fecha: expense.date,
                monto: Number(expense.amount),
                moneda: expense.currency,
                descripcion: expense.description,
                categoria: { nombre: expense.category.name, color: expense.category.color },
                fijo: expense.recurringExpenseId !== null,
              }))}
            />
        </section>
      )}
    </div>
  );
}
