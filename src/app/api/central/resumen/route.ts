import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { fechaEnUruguay } from "@/lib/monthly-summary";

/**
 * El resumen del mes en curso para Central, la app personal que lo muestra en su
 * inicio. Es de una sola cuenta: la de CENTRAL_USER_EMAIL.
 *
 * Solo responde con el token de CENTRAL_API_TOKEN. Sin token configurado se rechaza
 * siempre (falla cerrado), igual que el cron: un despliegue mal configurado no deja
 * los gastos de nadie a la vista.
 */
function autorizado(request: Request): boolean {
  const token = process.env.CENTRAL_API_TOKEN;
  if (!token) return false;

  const recibido = request.headers.get("authorization");
  if (!recibido) return false;

  const esperado = Buffer.from(`Bearer ${token}`);
  const llegado = Buffer.from(recibido);
  if (esperado.length !== llegado.length) return false;

  return timingSafeEqual(esperado, llegado);
}

type Totales = { UYU: number; USD: number };

function porMoneda(grupos: { currency: "UYU" | "USD"; _sum: { amount: unknown } }[]): Totales {
  const totales: Totales = { UYU: 0, USD: 0 };
  for (const g of grupos) totales[g.currency] = Number(g._sum.amount ?? 0);
  return totales;
}

const CATEGORIAS = 3;

export async function GET(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = process.env.CENTRAL_USER_EMAIL?.trim().toLowerCase();
  const usuario = email
    ? await prisma.user.findUnique({ where: { email }, select: { id: true } })
    : null;
  if (!usuario) {
    return NextResponse.json({ error: "CENTRAL_USER_EMAIL no corresponde a ninguna cuenta" }, { status: 404 });
  }
  const userId = usuario.id;

  // El mes y el día según el reloj de Uruguay. Los gastos guardan la fecha a las
  // 00:00 UTC del día elegido, así que los rangos van en UTC, como en el dashboard.
  const hoy = fechaEnUruguay(new Date());
  const inicio = new Date(Date.UTC(hoy.anio, hoy.mes - 1, 1));
  const fin = new Date(Date.UTC(hoy.anio, hoy.mes, 1));
  // El mes pasado hasta el mismo día, para comparar a igual altura del mes. Si el
  // mes pasado era más corto, Date.UTC corre el tope y `inicio` lo recorta.
  const inicioAnterior = new Date(Date.UTC(hoy.anio, hoy.mes - 2, 1));
  const topeAnterior = new Date(Date.UTC(hoy.anio, hoy.mes - 2, hoy.dia + 1));

  const [delMes, anterior, porCategoria] = await Promise.all([
    prisma.expense.groupBy({
      by: ["currency"],
      where: { userId, date: { gte: inicio, lt: fin } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.expense.groupBy({
      by: ["currency"],
      where: { userId, date: { gte: inicioAnterior, lt: topeAnterior < inicio ? topeAnterior : inicio } },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["categoryId", "currency"],
      where: { userId, date: { gte: inicio, lt: fin } },
      _sum: { amount: true },
    }),
  ]);

  // Las categorías se ordenan por lo gastado en pesos; los dólares van aparte.
  const sumas = new Map<string, Totales>();
  for (const g of porCategoria) {
    const t = sumas.get(g.categoryId) ?? { UYU: 0, USD: 0 };
    t[g.currency] += Number(g._sum.amount ?? 0);
    sumas.set(g.categoryId, t);
  }
  const principales = [...sumas.entries()]
    .sort((a, b) => b[1].UYU - a[1].UYU || b[1].USD - a[1].USD)
    .slice(0, CATEGORIAS);
  const categorias = await prisma.category.findMany({
    where: { id: { in: principales.map(([id]) => id) } },
    select: { id: true, name: true, color: true, emoji: true },
  });

  return NextResponse.json(
    {
      mes: `${hoy.anio}-${String(hoy.mes).padStart(2, "0")}`,
      dia: hoy.dia,
      total: porMoneda(delMes),
      cantidad: delMes.reduce((suma, g) => suma + g._count._all, 0),
      mesAnterior: porMoneda(anterior),
      categorias: principales.flatMap(([id, montos]) => {
        const c = categorias.find((cat) => cat.id === id);
        return c ? [{ nombre: c.name, color: c.color, emoji: c.emoji, ...montos }] : [];
      }),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
