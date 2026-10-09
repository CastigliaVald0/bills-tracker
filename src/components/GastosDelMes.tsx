"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/format";

export type GastoDelMes = {
  id: string;
  /** Día del mes (1-31). */
  dia: number;
  monto: number;
  moneda: "UYU" | "USD";
  descripcion: string | null;
  categoria: { nombre: string; color: string };
  fijo: boolean;
  /**
   * El monto llevado a pesos, solo para ordenar la lista cuando hay gastos en
   * las dos monedas. Los dólares usan la cotización guardada en cada gasto.
   */
  montoComparable: number;
};

/** El gasto más grande del mes: su día se marca más oscuro en el calendario. */
export type MayorGasto = {
  dia: number;
  monto: number;
  moneda: "UYU" | "USD";
  descripcion: string;
};

type Orden = "fecha-desc" | "fecha-asc" | "monto-desc" | "monto-asc";

const ORDENES: { valor: Orden; etiqueta: string }[] = [
  { valor: "fecha-desc", etiqueta: "Más recientes primero" },
  { valor: "fecha-asc", etiqueta: "Más antiguos primero" },
  { valor: "monto-desc", etiqueta: "Monto: de mayor a menor" },
  { valor: "monto-asc", etiqueta: "Monto: de menor a mayor" },
];

/**
 * Cuánto se tiñe un día, en porcentaje de color sobre el papel.
 *
 * El calendario antes solo decía si hubo gastos: un día de $200 se veía igual
 * que uno de $28.500. Ahora la intensidad dice cuánto.
 *
 * La escala es por raíz cuadrada y no lineal: casi todos los meses tienen un
 * gasto que dobla o triplica al resto —el alquiler— y en escala lineal ese día
 * se lleva todo el color y los demás quedan indistinguibles entre sí. La raíz
 * comprime el extremo y deja ver las diferencias entre los días normales, que
 * es lo que uno mira.
 */
const TINTE_MINIMO = 10;
const TINTE_MAXIMO = 46;

function tinteDelDia(total: number, tope: number) {
  if (tope <= 0 || total <= 0) return 0;
  return TINTE_MINIMO + Math.sqrt(total / tope) * (TINTE_MAXIMO - TINTE_MINIMO);
}

/** La semana arranca el lunes, como en los calendarios de acá. */
const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

export function GastosDelMes({
  gastos,
  anio,
  mes,
  nombreMes,
  diaDeHoy,
  mayorGasto,
}: {
  gastos: GastoDelMes[];
  anio: number;
  /** 1-12 */
  mes: number;
  /** "setiembre" */
  nombreMes: string;
  /** El día de hoy si se está viendo el mes en curso; si no, null. */
  diaDeHoy: number | null;
  mayorGasto: MayorGasto | null;
}) {
  const [orden, setOrden] = useState<Orden>("fecha-desc");
  const [diaElegido, setDiaElegido] = useState<number | null>(null);

  const diasDelMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  // getUTCDay: 0 = domingo. Se corre para que el lunes sea la primera columna.
  const huecoInicial =
    (new Date(Date.UTC(anio, mes - 1, 1)).getUTCDay() + 6) % 7;

  /**
   * Cuántos gastos y cuánta plata por día. El monto usa `montoComparable`
   * (dólares llevados a pesos) porque la barra compara días entre sí, y
   * mezclar monedas sin convertir daría una altura mentirosa.
   */
  const porDia = useMemo(() => {
    const mapa = new Map<number, { cantidad: number; total: number }>();
    for (const g of gastos) {
      const entrada = mapa.get(g.dia) ?? { cantidad: 0, total: 0 };
      entrada.cantidad += 1;
      entrada.total += g.montoComparable;
      mapa.set(g.dia, entrada);
    }
    return mapa;
  }, [gastos]);

  /** El día más caro marca el tope de la escala de las barras. */
  const topeDelMes = useMemo(
    () => Math.max(0, ...[...porDia.values()].map((d) => d.total)),
    [porDia]
  );

  const visibles = useMemo(() => {
    const lista =
      diaElegido === null
        ? [...gastos]
        : gastos.filter((g) => g.dia === diaElegido);
    // sort es estable: a igual día o monto se respeta el orden de carga.
    lista.sort((a, b) => {
      switch (orden) {
        case "fecha-asc":
          return a.dia - b.dia;
        case "monto-desc":
          return b.montoComparable - a.montoComparable;
        case "monto-asc":
          return a.montoComparable - b.montoComparable;
        default:
          return b.dia - a.dia;
      }
    });
    return lista;
  }, [gastos, orden, diaElegido]);

  const totalVisible = visibles.reduce(
    (t, g) => ({ ...t, [g.moneda]: t[g.moneda] + g.monto }),
    { UYU: 0, USD: 0 },
  );

  const fechaCorta = (dia: number) =>
    new Intl.DateTimeFormat("es-UY", {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(anio, mes - 1, dia)));

  return (
    <div className="flex flex-col gap-3">
      <div className="tarjeta p-3 sm:p-4">
        {/* En PC los días se estiraban hasta casi 90px: se limita el ancho y se
            centra. En celular la tarjeta ya es más angosta que este máximo. */}
        <div className="mx-auto max-w-md">
          <div className="mb-1 grid grid-cols-7 text-center" aria-hidden>
            {DIAS_SEMANA.map((d) => (
              <span key={d} className="rotulo py-1">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: huecoInicial }, (_, i) => (
              <span key={`hueco-${i}`} />
            ))}
            {Array.from({ length: diasDelMes }, (_, i) => i + 1).map((dia) => {
              const { cantidad, total } = porDia.get(dia) ?? { cantidad: 0, total: 0 };
              const elegido = diaElegido === dia;
              const esHoy = diaDeHoy === dia;
              const esMayor = mayorGasto?.dia === dia;
              const color = esMayor ? "var(--alerta)" : "var(--peso)";
              const tinte = tinteDelDia(total, topeDelMes);

              return (
                <button
                  key={dia}
                  type="button"
                  disabled={cantidad === 0}
                  onClick={() => setDiaElegido(elegido ? null : dia)}
                  aria-pressed={elegido}
                  aria-label={
                    cantidad > 0
                      ? `${dia} de ${nombreMes}: ${cantidad} ${cantidad === 1 ? "gasto" : "gastos"}${esMayor ? ", el día del mayor gasto" : ""}`
                      : `${dia} de ${nombreMes}: sin gastos`
                  }
                  className={`monto flex aspect-square items-center justify-center rounded-md text-sm transition-colors ${
                    elegido
                      ? "font-semibold text-superficie"
                      : cantidad > 0
                        ? "text-texto hover:ring-1 hover:ring-peso"
                        : "cursor-default text-tenue"
                  } ${esHoy && !elegido ? "ring-1 ring-borde-fuerte" : ""}`}
                  style={
                    elegido
                      ? { backgroundColor: color }
                      : cantidad > 0
                        ? {
                            backgroundColor: `color-mix(in srgb, ${color} ${tinte}%, transparent)`,
                          }
                        : undefined
                  }
                >
                  {dia}
                </button>
              );
            })}
          </div>

          {/* Se fue el chip "Días con gastos": cada celda ya muestra cuántos
              hay, así que la referencia explicaba algo que estaba a la vista.
              Queda el mayor gasto, que además de informar filtra ese día. */}
          {mayorGasto && (
            <button
              type="button"
              onClick={() => setDiaElegido(mayorGasto.dia)}
              className="mt-3 flex w-full min-w-0 items-center gap-1.5 border-t border-borde pt-3 text-left text-xs text-suave transition-colors hover:text-texto"
              aria-label={`Ver el día del mayor gasto: ${mayorGasto.descripcion}, ${formatMoney(mayorGasto.monto, mayorGasto.moneda)}, día ${mayorGasto.dia}`}
            >
              {/* La misma forma y tinte que la celda del día. */}
              <span
                aria-hidden
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: "color-mix(in srgb, var(--alerta) 46%, transparent)" }}
              />
              <span className="min-w-0 truncate">
                Mayor gasto · día {mayorGasto.dia} ·{" "}
                <span className="monto text-texto">
                  {formatMoney(mayorGasto.monto, mayorGasto.moneda)}
                </span>{" "}
                · {mayorGasto.descripcion}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Una sola fila: qué se está viendo a la izquierda, cómo ordenarlo a la
          derecha. Antes eran tres renglones apilados —el filtro, el orden y el
          conteo— para decir lo mismo. */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="monto min-w-0 text-xs text-suave">
          {diaElegido !== null && (
            <button
              type="button"
              onClick={() => setDiaElegido(null)}
              className="mr-2 rounded-full bg-superficie-alta px-2 py-1 text-texto transition-colors hover:bg-borde"
              aria-label={`Quitar el filtro del día ${diaElegido} y ver todos`}
            >
              Día {diaElegido} <span aria-hidden>✕</span>
            </button>
          )}
          {visibles.length} {visibles.length === 1 ? "gasto" : "gastos"}
          {totalVisible.UYU > 0 && ` · ${formatMoney(totalVisible.UYU, "UYU")}`}
          {totalVisible.USD > 0 && ` · ${formatMoney(totalVisible.USD, "USD")}`}
        </p>

        <label className="flex shrink-0 items-center gap-2">
          <span className="sr-only">Ordenar</span>
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as Orden)}
            className="campo w-auto py-1 text-xs"
          >
            {ORDENES.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.etiqueta}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="lista">
        {visibles.map((g) => (
          <div key={g.id} className="fila">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span
                aria-hidden
                className="filete"
                style={{ backgroundColor: g.categoria.color }}
              />
              <div className="min-w-0">
                <p className="truncate text-sm text-texto">
                  {g.descripcion || g.categoria.nombre}
                </p>
                <p className="rotulo mt-1 truncate normal-case tracking-normal">
                  {fechaCorta(g.dia)} · {g.categoria.nombre}
                  {g.fijo && " · fijo"}
                </p>
              </div>
            </div>
            <span className="monto shrink-0 text-sm text-texto">
              {formatMoney(g.monto, g.moneda)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
