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

  const cantidadPorDia = useMemo(() => {
    const mapa = new Map<number, number>();
    for (const g of gastos) mapa.set(g.dia, (mapa.get(g.dia) ?? 0) + 1);
    return mapa;
  }, [gastos]);

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
              const cantidad = cantidadPorDia.get(dia) ?? 0;
              const elegido = diaElegido === dia;
              const esHoy = diaDeHoy === dia;
              const esMayor = mayorGasto?.dia === dia;
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
                  className={`relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md text-sm transition-colors ${
                    elegido
                      ? `${esMayor ? "bg-alerta" : "bg-peso"} font-semibold text-superficie`
                      : cantidad > 0
                        ? "font-medium text-texto hover:ring-1 hover:ring-peso"
                        : "cursor-default text-tenue"
                  } ${esHoy && !elegido ? "ring-1 ring-borde-fuerte" : ""}`}
                  // Los días con gastos se tiñen con el color de los pesos; el del
                  // mayor gasto, con el rojo de la app, con el mismo tinte suave.
                  style={
                    cantidad > 0 && !elegido
                      ? {
                          backgroundColor: esMayor
                            ? "color-mix(in srgb, var(--alerta) 22%, transparent)"
                            : "color-mix(in srgb, var(--peso) 16%, transparent)",
                        }
                      : undefined
                  }
                >
                  <span className="monto leading-none">{dia}</span>
                  {cantidad > 0 && (
                    <span
                      aria-hidden
                      className="monto text-[10px] leading-none opacity-75"
                    >
                      {cantidad}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Referencias: el color nunca es el único que avisa. La del mayor
              gasto además filtra ese día. */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-borde pt-3 text-xs text-suave">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: "color-mix(in srgb, var(--peso) 16%, transparent)" }}
              />
              Días con gastos
            </span>
            {mayorGasto && (
              <button
                type="button"
                onClick={() => setDiaElegido(mayorGasto.dia)}
                className="flex min-w-0 items-center gap-1.5 text-left hover:text-texto"
                aria-label={`Ver el día del mayor gasto: ${mayorGasto.descripcion}, ${formatMoney(mayorGasto.monto, mayorGasto.moneda)}, día ${mayorGasto.dia}`}
              >
                <span
                  aria-hidden
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: "color-mix(in srgb, var(--alerta) 22%, transparent)" }}
                />
                <span className="min-w-0">
                  Mayor gasto:{" "}
                  <span className="monto text-texto">
                    {formatMoney(mayorGasto.monto, mayorGasto.moneda)}
                  </span>{" "}
                  · {mayorGasto.descripcion} · día {mayorGasto.dia}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {diaElegido === null ? (
          <p className="text-sm text-suave">
            Todos los días · tocá un día para filtrar
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setDiaElegido(null)}
            className="boton-linea py-1 text-sm"
            aria-label={`Quitar el filtro del día ${diaElegido} y ver todos`}
          >
            Día {diaElegido} <span aria-hidden>✕</span>
          </button>
        )}
        <label className="flex items-center gap-2">
          <span className="rotulo">Ordenar</span>
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as Orden)}
            className="campo w-auto py-1.5 text-sm"
          >
            {ORDENES.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.etiqueta}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="monto text-xs text-suave">
        {visibles.length} {visibles.length === 1 ? "gasto" : "gastos"}
        {totalVisible.UYU > 0 && ` · ${formatMoney(totalVisible.UYU, "UYU")}`}
        {totalVisible.USD > 0 && ` · ${formatMoney(totalVisible.USD, "USD")}`}
      </p>

      <div className="lista">
        {visibles.map((g) => (
          <div key={g.id} className="fila">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span
                className="punto"
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
