import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { redirect } from "next/navigation";
import { formatMoney, currentMonth, monthLabel } from "@/lib/format";
import { BrouLink } from "@/components/BrouLink";
import { Pizarra } from "@/components/Pizarra";
import { Vacio, IconoTicket } from "@/components/Vacio";
import { UltimosGastos } from "@/components/UltimosGastos";
import { TiraDelMes, type DiaDelMes } from "@/components/TiraDelMes";
import { LoQueViene } from "@/components/LoQueViene";
import { fechaEnUruguay } from "@/lib/monthly-summary";

export default async function DashboardPage() {
  const userId = await requireUserId();
  if (!userId) redirect("/login");

  const month = currentMonth();
  const [year, mon] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, mon - 1, 1));
  const end = new Date(Date.UTC(year, mon, 1));

  // "Hoy" según el reloj de Uruguay, no el del servidor (UTC).
  const hoy = fechaEnUruguay(new Date());

  // Hasta el mismo día del mes pasado, para comparar a igual altura del mes.
  // Si el mes pasado era más corto (31 → 30), Date.UTC corre el tope al mes
  // actual y `lt: start` lo vuelve a recortar.
  const inicioAnterior = new Date(Date.UTC(year, mon - 2, 1));
  const topeAnterior = new Date(Date.UTC(year, mon - 2, hoy.dia + 1));

  const [expenses, anteriores, fijos] = await Promise.all([
    prisma.expense.findMany({
      where: { userId, date: { gte: start, lt: end } },
      include: { category: true, grupo: { select: { nombre: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.expense.groupBy({
      by: ["currency"],
      where: { userId, date: { gte: inicioAnterior, lt: topeAnterior < start ? topeAnterior : start } },
      _sum: { amount: true },
    }),
    // Los fijos que todavía no cayeron este mes: activos, sin vencer y con el
    // día de cobro después de hoy.
    prisma.recurringExpense.findMany({
      where: {
        userId,
        active: true,
        dayOfMonth: { gt: hoy.dia },
        OR: [{ endsOn: null }, { endsOn: { gte: start } }],
      },
      include: { category: true },
      orderBy: { dayOfMonth: "asc" },
    }),
  ]);

  const diasDelMes = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const porDia: DiaDelMes[] = Array.from({ length: diasDelMes }, () => ({ UYU: 0, USD: 0 }));
  const totals = { UYU: 0, USD: 0 };
  for (const expense of expenses) {
    const monto = Number(expense.amount);
    totals[expense.currency] += monto;
    porDia[expense.date.getUTCDate() - 1][expense.currency] += monto;
  }

  const nombreMes = monthLabel(month).split(" de ")[0];
  const nombreAnterior = monthLabel(
    `${inicioAnterior.getUTCFullYear()}-${String(inicioAnterior.getUTCMonth() + 1).padStart(2, "0")}`
  ).split(" de ")[0];

  // Solo en pesos: es la moneda del día a día, y las dos no se suman.
  const pesosAnterior = Number(anteriores.find((g) => g.currency === "UYU")?._sum.amount ?? 0);
  const diferencia = totals.UYU - pesosAnterior;
  const comparacion =
    pesosAnterior === 0
      ? null
      : Math.abs(diferencia) < 1
        ? `Vas igual que en ${nombreAnterior} a esta altura.`
        : `Vas ${formatMoney(Math.abs(diferencia), "UYU")} ${
            diferencia > 0 ? "por encima" : "por debajo"
          } de ${nombreAnterior} a esta altura.`;

  const pendientes = fijos.map((f) => ({
    id: f.id,
    dia: f.dayOfMonth,
    monto: Number(f.amount),
    moneda: f.currency,
    nombre: f.description || f.category.name,
    color: f.category.color,
  }));

  return (
    <div className="flex flex-col gap-10">
      <Pizarra
        rotulo="Gastado este mes"
        titulo={monthLabel(month)}
        accion={<BrouLink />}
        pesos={formatMoney(totals.UYU, "UYU")}
        dolares={formatMoney(totals.USD, "USD")}
      />

      {expenses.length === 0 ? (
        <>
          <Vacio
            icono={<IconoTicket />}
            titulo="Todavía no hay nada este mes"
            detalle="Cargá tu primer gasto y acá vas a ver lo último que anotaste, día por día y con cada moneda por separado."
            accion={{ href: "/expenses", texto: "Cargar un gasto" }}
          />
          {pendientes.length > 0 && (
            <LoQueViene pendientes={pendientes} hoy={hoy.dia} nombreMes={nombreMes} />
          )}
        </>
      ) : (
        <>
          <TiraDelMes dias={porDia} hoy={hoy.dia} nombreMes={nombreMes} comparacion={comparacion} />

          {/* En PC, el ticket y lo que falta van lado a lado: lo que ya pasó a
              la izquierda, lo que viene a la derecha. */}
          <div className="grid grid-cols-1 items-start gap-10 sm:grid-cols-[minmax(0,1fr)_17.5rem] sm:gap-6">
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
                grupo: expense.grupo?.nombre ?? null,
              }))}
            />
            <LoQueViene pendientes={pendientes} hoy={hoy.dia} nombreMes={nombreMes} />
          </div>
        </>
      )}
    </div>
  );
}
