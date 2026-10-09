import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { formatMoney, monthLabel } from "@/lib/format";
import { getUsdRate } from "@/lib/exchange-rate";
import { fechaEnUruguay } from "@/lib/monthly-summary";
import { Pizarra } from "@/components/Pizarra";
import { RepartoFijos } from "@/components/RepartoFijos";
import { Vacio, IconoCalendario } from "@/components/Vacio";
import { ListaCategorias, type TotalCategoria } from "@/components/ListaCategorias";
import { GastosDelMes, type GastoDelMes } from "@/components/GastosDelMes";

type Moneda = "UYU" | "USD";
type Totales = { UYU: number; USD: number };

/** "2026-09" a partir de año y mes (1-12). */
function claveDe(anio: number, mes: number) {
  return `${anio}-${String(mes).padStart(2, "0")}`;
}

/** Suma (o resta) meses a un par año/mes, cruzando años si hace falta. */
function moverMes(anio: number, mes: number, delta: number) {
  const fecha = new Date(Date.UTC(anio, mes - 1 + delta, 1));
  return { anio: fecha.getUTCFullYear(), mes: fecha.getUTCMonth() + 1 };
}

/** "setiembre" */
function nombreDelMes(anio: number, mes: number) {
  return monthLabel(claveDe(anio, mes)).split(" de ")[0];
}

export default async function MonthlyPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const userId = await requireUserId();
  if (!userId) redirect("/login");

  // El mes en curso según el reloj de Uruguay, no el del servidor (UTC).
  const hoy = fechaEnUruguay(new Date());
  const claveHoy = claveDe(hoy.anio, hoy.mes);

  const { mes: mesPedido } = await searchParams;
  const pedido = mesPedido && /^\d{4}-(0[1-9]|1[0-2])$/.test(mesPedido) ? mesPedido : claveHoy;
  // Los meses que todavía no llegaron no se muestran: se cae en el actual.
  const claveMes = pedido > claveHoy ? claveHoy : pedido;
  const [anio, mes] = claveMes.split("-").map(Number);
  const esMesActual = claveMes === claveHoy;

  // Una sola consulta con los últimos 6 meses: alcanza para el mes, la
  // comparación con los anteriores y el gráfico.
  const primero = moverMes(anio, mes, -5);
  const [gastos, cotizacion] = await Promise.all([
    prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: new Date(Date.UTC(primero.anio, primero.mes - 1, 1)),
          lt: new Date(Date.UTC(anio, mes, 1)),
        },
      },
      include: { category: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    getUsdRate(),
  ]);

  // Solo para ORDENAR cuando hay pesos y dólares mezclados. Cada gasto en
  // dólares usa su cotización guardada; si no tiene, la de hoy.
  const tasaDeRespaldo = cotizacion?.venta ?? 40;
  const enPesos = (g: (typeof gastos)[number]) =>
    g.currency === "UYU"
      ? Number(g.amount)
      : Number(g.amount) * (g.usdRate ? Number(g.usdRate) : tasaDeRespaldo);
  const claveDelGasto = (g: (typeof gastos)[number]) =>
    claveDe(g.date.getUTCFullYear(), g.date.getUTCMonth() + 1);

  // Totales de cada uno de los 6 meses, del más viejo al actual.
  const serie = Array.from({ length: 6 }, (_, i) => {
    const m = moverMes(anio, mes, i - 5);
    return { ...m, clave: claveDe(m.anio, m.mes), totales: { UYU: 0, USD: 0 } as Totales, cantidad: 0 };
  });
  const posicion = new Map(serie.map((s, i) => [s.clave, i]));
  for (const g of gastos) {
    const i = posicion.get(claveDelGasto(g));
    if (i === undefined) continue;
    serie[i].totales[g.currency] += Number(g.amount);
    serie[i].cantidad++;
  }
  const actual = serie[5];
  const anterior = serie[4];
  const delMes = gastos.filter((g) => claveDelGasto(g) === claveMes);

  // Categorías de este mes y del anterior, para el listado y los cambios.
  const porCategoria = new Map<string, TotalCategoria & { antes: Totales }>();
  for (const g of gastos) {
    const clave = claveDelGasto(g);
    if (clave !== claveMes && clave !== anterior.clave) continue;
    const entrada = porCategoria.get(g.categoryId) ?? {
      name: g.category.name,
      color: g.category.color,
      UYU: 0,
      USD: 0,
      antes: { UYU: 0, USD: 0 },
    };
    if (clave === claveMes) entrada[g.currency] += Number(g.amount);
    else entrada.antes[g.currency] += Number(g.amount);
    porCategoria.set(g.categoryId, entrada);
  }
  const categoriasDelMes = [...porCategoria.values()]
    .filter((c) => c.UYU > 0 || c.USD > 0)
    .sort((a, b) => b.UYU + b.USD * tasaDeRespaldo - (a.UYU + a.USD * tasaDeRespaldo));

  // El gasto más grande del mes: su día se marca más oscuro en el calendario.
  const mayorGasto = delMes.reduce<(typeof delMes)[number] | null>(
    (mayor, g) => (!mayor || enPesos(g) > enPesos(mayor) ? g : mayor),
    null
  );

  const gastosDelMes: GastoDelMes[] = delMes.map((g) => ({
    id: g.id,
    dia: g.date.getUTCDate(),
    monto: Number(g.amount),
    moneda: g.currency,
    descripcion: g.description,
    categoria: { nombre: g.category.name, color: g.category.color },
    fijo: g.recurringExpenseId !== null,
    montoComparable: enPesos(g),
  }));

  const nombreMes = nombreDelMes(anio, mes);

  const nombreAnterior = nombreDelMes(anterior.anio, anterior.mes);

  /**
   * La comparación contra el mes anterior, en una línea, para poner debajo de
   * cada cifra de la pizarra.
   *
   * Reemplaza a la tarjeta de veredicto y al acordeón "Frente a meses
   * anteriores": el dato describe a ese número, así que va pegado a él. Se
   * quitó la comparación contra el promedio: dos referencias para el mismo
   * número competían entre sí y ninguna se leía.
   */
  function notaComparacion(moneda: Moneda): React.ReactNode {
    if (anterior.cantidad === 0) return `Sin gastos en ${nombreAnterior} para comparar`;

    const previo = anterior.totales[moneda];
    const ahora = actual.totales[moneda];
    if (previo === 0) {
      return ahora > 0 ? `En ${nombreAnterior} no hubo` : `Igual que en ${nombreAnterior}`;
    }

    const pct = Math.round(((ahora - previo) / previo) * 100);
    if (pct === 0) return `Igual que en ${nombreAnterior}`;

    return (
      <>
        <span aria-hidden>{pct > 0 ? "▲" : "▼"} </span>
        <span className="sr-only">{pct > 0 ? "subió " : "bajó "}</span>
        {Math.abs(pct)} % que en {nombreAnterior}
      </>
    );
  }

  /**
   * Cuánto del mes vino de un gasto fijo y cuánto se decidió sobre la marcha.
   * El dato ya existía por gasto (`recurringExpenseId`); lo que faltaba era
   * sumarlo.
   */
  const reparto: Partial<Record<Moneda, { fijo: number; variable: number }>> = {};
  for (const g of delMes) {
    const actualReparto = (reparto[g.currency] ??= { fijo: 0, variable: 0 });
    if (g.recurringExpenseId !== null) actualReparto.fijo += Number(g.amount);
    else actualReparto.variable += Number(g.amount);
  }
  const monedasConGasto = (Object.keys(reparto) as Moneda[]).length;

  // Lo que gastó cada categoría el mes pasado, para el cambio por fila.
  const categoriasAntes = new Map(
    [...porCategoria.values()].map((c) => [c.name, c.antes])
  );

  const mesPrevio = moverMes(anio, mes, -1);
  const mesSiguiente = moverMes(anio, mes, 1);

  const navMeses = (
    <div className="flex shrink-0 items-center gap-1">
      <Link
        href={`/monthly?mes=${claveDe(mesPrevio.anio, mesPrevio.mes)}`}
        className="flex h-8 w-8 items-center justify-center rounded border border-pizarra-borde text-pizarra-suave transition-colors hover:border-peso-luz hover:text-pizarra-texto"
        aria-label={`Ir a ${nombreDelMes(mesPrevio.anio, mesPrevio.mes)}`}
      >
        ←
      </Link>
      {esMesActual ? (
        <span
          className="flex h-8 w-8 items-center justify-center rounded border border-pizarra-borde text-pizarra-suave opacity-40"
          aria-hidden
        >
          →
        </span>
      ) : (
        <Link
          href={`/monthly?mes=${claveDe(mesSiguiente.anio, mesSiguiente.mes)}`}
          className="flex h-8 w-8 items-center justify-center rounded border border-pizarra-borde text-pizarra-suave transition-colors hover:border-dolar-luz hover:text-pizarra-texto"
          aria-label={`Ir a ${nombreDelMes(mesSiguiente.anio, mesSiguiente.mes)}`}
        >
          →
        </Link>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <Pizarra
        rotulo="Gastado en el mes"
        titulo={monthLabel(claveMes)}
        accion={navMeses}
        pesos={formatMoney(actual.totales.UYU, "UYU")}
        dolares={formatMoney(actual.totales.USD, "USD")}
        notaPesos={delMes.length > 0 ? notaComparacion("UYU") : undefined}
        notaDolares={delMes.length > 0 ? notaComparacion("USD") : undefined}
        pie={
          delMes.length > 0 ? (
            <RepartoFijos reparto={reparto} variasMonedas={monedasConGasto > 1} />
          ) : undefined
        }
      />

      {delMes.length === 0 ? (
        <Vacio
          icono={<IconoCalendario />}
          titulo={`Sin gastos en ${nombreMes} de ${anio}`}
          detalle="Movete a otro mes con las flechas de arriba, o cargá un gasto con esta fecha para que aparezca acá."
        />
      ) : (
        <>
          {/* El calendario con el filtro por día: la idea queda, el envoltorio
              se aligeró (ver GastosDelMes). */}
          <section>
            <h2 className="rotulo mb-3">Gastos del mes</h2>
            <GastosDelMes
              gastos={gastosDelMes}
              anio={anio}
              mes={mes}
              nombreMes={nombreMes}
              diaDeHoy={esMesActual ? hoy.dia : null}
              mayorGasto={
                mayorGasto && {
                  dia: mayorGasto.date.getUTCDate(),
                  monto: Number(mayorGasto.amount),
                  moneda: mayorGasto.currency,
                  descripcion: mayorGasto.description || mayorGasto.category.name,
                }
              }
            />
          </section>

          {/* Cada fila trae su propio cambio contra el mes anterior, así que
              ya no hace falta la sección "Qué cambió", que además solo
              mostraba dos categorías de todas. */}
          <section>
            <h2 className="rotulo mb-3">Por categoría</h2>
            <ListaCategorias
              categorias={categoriasDelMes}
              totales={actual.totales}
              antes={anterior.cantidad > 0 ? categoriasAntes : undefined}
            />
          </section>
        </>
      )}
    </div>
  );
}
