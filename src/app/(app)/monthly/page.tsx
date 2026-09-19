import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { formatMoney, monthLabel } from "@/lib/format";
import { getUsdRate } from "@/lib/exchange-rate";
import { fechaEnUruguay } from "@/lib/monthly-summary";
import { Pizarra } from "@/components/Pizarra";
import { BarrasMes } from "@/components/BarrasMes";
import { ListaCategorias, type TotalCategoria } from "@/components/ListaCategorias";
import { GastosDelMes, type GastoDelMes } from "@/components/GastosDelMes";
import { Desplegable } from "@/components/Desplegable";

type Moneda = "UYU" | "USD";
type Totales = { UYU: number; USD: number };

const NOMBRE_MONEDA: Record<Moneda, string> = { UYU: "Pesos", USD: "Dólares" };

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

  // Promedio de los 3 meses anteriores, contando solo los que tienen gastos:
  // antes de empezar a usar la app no hay datos, y un cero ahí bajaría el
  // promedio sin motivo.
  const previosConDatos = serie.slice(2, 5).filter((s) => s.cantidad > 0);
  const promedio: Totales | null =
    previosConDatos.length > 0
      ? {
          UYU: previosConDatos.reduce((t, s) => t + s.totales.UYU, 0) / previosConDatos.length,
          USD: previosConDatos.reduce((t, s) => t + s.totales.USD, 0) / previosConDatos.length,
        }
      : null;

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

  function cambiosDeCategoria(moneda: Moneda) {
    let subio: Cambio | null = null;
    let bajo: Cambio | null = null;
    for (const c of porCategoria.values()) {
      const dif = c[moneda] - c.antes[moneda];
      const cambio = { name: c.name, color: c.color, antes: c.antes[moneda], ahora: c[moneda], dif };
      if (dif > 0 && (!subio || dif > subio.dif)) subio = cambio;
      if (dif < 0 && (!bajo || dif < bajo.dif)) bajo = cambio;
    }
    return { subio, bajo };
  }

  const monedasEnComparacion: Moneda[] = (["UYU", "USD"] as Moneda[]).filter(
    (m) => m === "UYU" || actual.totales.USD > 0 || anterior.totales.USD > 0 || (promedio?.USD ?? 0) > 0
  );
  const hayDolaresEnSerie = serie.some((s) => s.totales.USD > 0);

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

  // Titulares de las secciones desplegables: lo importante en una línea.
  const cambiosPesos = cambiosDeCategoria("UYU");
  const resumenComparacion =
    anterior.cantidad > 0
      ? `${textoVariacion(actual.totales.UYU, anterior.totales.UYU)} en pesos frente a ${nombreDelMes(anterior.anio, anterior.mes)}`
      : `Sin gastos en ${nombreDelMes(anterior.anio, anterior.mes)} para comparar`;
  const resumenCambios =
    [
      cambiosPesos.subio && `${cambiosPesos.subio.name} subió`,
      cambiosPesos.bajo && `${cambiosPesos.bajo.name} bajó`,
    ]
      .filter(Boolean)
      .join(" · ") || "Ninguna categoría cambió en pesos";
  const resumenCategorias = categoriasDelMes.length
    ? `${categoriasDelMes.length} ${categoriasDelMes.length === 1 ? "categoría" : "categorías"} · la mayor: ${categoriasDelMes[0].name}`
    : "Sin categorías";
  const nombreAnterior = nombreDelMes(anterior.anio, anterior.mes);
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
      />

      {delMes.length === 0 ? (
        <p className="tarjeta px-4 py-8 text-center text-sm text-suave">
          No hay gastos cargados en {nombreMes} de {anio}.
        </p>
      ) : (
        <>
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

          <section className="flex flex-col gap-2.5">
            <h2 className="rotulo">Más detalle</h2>

            <Desplegable titulo="Categorías del mes" resumen={resumenCategorias}>
              <ListaCategorias categorias={categoriasDelMes} totales={actual.totales} />
            </Desplegable>

            <Desplegable titulo="Frente a meses anteriores" resumen={resumenComparacion}>
              <div className="flex flex-col gap-2.5">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {monedasEnComparacion.map((moneda) => (
                    <div key={moneda} className="rounded-md border border-borde p-4">
                      <p className="rotulo">{NOMBRE_MONEDA[moneda]}</p>
                      <p className="monto mt-1.5 text-lg text-texto">
                        {formatMoney(actual.totales[moneda], moneda)}
                      </p>
                      <dl className="mt-3 flex flex-col gap-2 border-t border-borde pt-3 text-sm">
                        <div className="flex items-baseline justify-between gap-3">
                          <dt className="text-suave">Frente a {nombreAnterior}</dt>
                          <dd>
                            <Variacion
                              actual={actual.totales[moneda]}
                              anterior={anterior.cantidad > 0 ? anterior.totales[moneda] : null}
                              moneda={moneda}
                            />
                          </dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-3">
                          <dt className="text-suave">
                            Frente al promedio
                            {promedio &&
                              ` de ${previosConDatos.length} ${previosConDatos.length === 1 ? "mes" : "meses"}`}
                          </dt>
                          <dd>
                            <Variacion
                              actual={actual.totales[moneda]}
                              anterior={promedio ? promedio[moneda] : null}
                              moneda={moneda}
                            />
                          </dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                </div>

                <div className="rounded-md border border-borde px-2 pt-3 pb-1 sm:px-3">
                  <p className="rotulo px-2 pb-1">
                    Últimos 6 meses <span className="text-peso">· pesos</span>
                  </p>
                  <BarrasMes
                    meses={serie.map((s) => ({ mes: s.mes - 1, monto: s.totales.UYU }))}
                    moneda="UYU"
                  />
                </div>
                {hayDolaresEnSerie && (
                  <div className="rounded-md border border-borde px-2 pt-3 pb-1 sm:px-3">
                    <p className="rotulo px-2 pb-1">
                      Últimos 6 meses <span className="text-dolar">· dólares</span>
                    </p>
                    <BarrasMes
                      meses={serie.map((s) => ({ mes: s.mes - 1, monto: s.totales.USD }))}
                      moneda="USD"
                    />
                  </div>
                )}
              </div>
            </Desplegable>

            {anterior.cantidad > 0 && (
              <Desplegable titulo={`Qué cambió frente a ${nombreAnterior}`} resumen={resumenCambios}>
                <div className="flex flex-col">
                  {monedasEnComparacion.map((moneda) => {
                    const { subio, bajo } = cambiosDeCategoria(moneda);
                    return (
                      <div key={moneda} className="border-borde not-first:border-t">
                        {monedasEnComparacion.length > 1 && (
                          <p className="rotulo px-1 pt-2">{NOMBRE_MONEDA[moneda]}</p>
                        )}
                        {subio || bajo ? (
                          <>
                            {subio && <FilaCambio tipo="Más subió" cambio={subio} moneda={moneda} />}
                            {bajo && <FilaCambio tipo="Más bajó" cambio={bajo} moneda={moneda} />}
                          </>
                        ) : (
                          <p className="px-1 py-3 text-sm text-suave">Ninguna categoría cambió.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Desplegable>
            )}
          </section>
        </>
      )}
    </div>
  );
}

type Cambio = { name: string; color: string; antes: number; ahora: number; dif: number };

/** "▲ +77%" para el titular de una sección cerrada. */
function textoVariacion(actual: number, anterior: number) {
  if (anterior === 0) return actual > 0 ? "▲ Subió" : "= Igual";
  const porcentaje = Math.round(((actual - anterior) / anterior) * 100);
  if (porcentaje === 0) return "= Igual";
  return `${porcentaje > 0 ? "▲ +" : "▼ "}${porcentaje}%`;
}

/** Diferencia contra una referencia, con flecha y signo: nunca solo con color. */
function Variacion({
  actual,
  anterior,
  moneda,
}: {
  actual: number;
  anterior: number | null;
  moneda: Moneda;
}) {
  if (anterior === null) return <span className="text-sm text-tenue">Sin datos</span>;
  if (anterior === 0) {
    return <span className="text-sm text-suave">{actual > 0 ? "Antes no había" : "Igual"}</span>;
  }
  const dif = actual - anterior;
  const porcentaje = Math.round((dif / anterior) * 100);
  const flecha = dif > 0 ? "▲" : dif < 0 ? "▼" : "=";
  return (
    <span className="monto text-sm text-texto">
      <span aria-hidden>{flecha} </span>
      <span className="sr-only">{dif > 0 ? "subió " : dif < 0 ? "bajó " : "igual "}</span>
      {dif > 0 ? "+" : ""}
      {porcentaje}%{" "}
      <span className="text-suave">
        ({dif >= 0 ? "+" : "−"}
        {formatMoney(Math.abs(dif), moneda)})
      </span>
    </span>
  );
}

function FilaCambio({ tipo, cambio, moneda }: { tipo: string; cambio: Cambio; moneda: Moneda }) {
  return (
    <div className="flex items-center gap-3 px-1 py-3">
      <span
        aria-hidden
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: `color-mix(in srgb, ${cambio.color} 18%, transparent)` }}
      >
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: cambio.color }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="rotulo">{tipo}</p>
        <p className="truncate text-sm font-semibold text-texto">{cambio.name}</p>
        {/* Sin truncate: en celular cortaba la cifra final. Si no entra, baja
            de línea antes de la flecha. */}
        <p className="monto text-xs text-suave">
          {formatMoney(cambio.antes, moneda)} <span className="whitespace-nowrap">→ {formatMoney(cambio.ahora, moneda)}</span>
        </p>
      </div>
      <span className="monto shrink-0 text-sm text-texto">
        <span aria-hidden>{cambio.dif > 0 ? "▲" : "▼"} </span>
        {cambio.dif > 0 ? "+" : "−"}
        {formatMoney(Math.abs(cambio.dif), moneda)}
      </span>
    </div>
  );
}
