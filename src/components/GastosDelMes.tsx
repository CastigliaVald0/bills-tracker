"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/format";
import { CalendarioMes, type DiaDelMes } from "@/components/CalendarioMes";
import { Insignia } from "@/components/Insignia";

export type GastoDelMes = {
  id: string;
  /** Día del mes (1-31). */
  dia: number;
  monto: number;
  moneda: "UYU" | "USD";
  descripcion: string | null;
  categoria: { nombre: string; color: string; emoji?: string | null };
  fijo: boolean;
  /** El nombre del grupo, si el gasto se cargó dentro de uno. */
  grupo?: string | null;
  /**
   * El monto llevado a pesos, solo para ordenar la lista cuando hay gastos en
   * las dos monedas. Los dólares usan la cotización guardada en cada gasto.
   */
  montoComparable: number;
};

/** El gasto más grande del mes: su día va en el color de alerta en el calendario. */
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

  /** Lo gastado cada día en cada moneda, para los círculos del calendario. */
  const porDia = useMemo(() => {
    const lista: DiaDelMes[] = Array.from({ length: diasDelMes }, () => ({ UYU: 0, USD: 0 }));
    for (const g of gastos) lista[g.dia - 1][g.moneda] += g.monto;
    return lista;
  }, [gastos, diasDelMes]);

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

  // "16 de octubre"
  const fechaCorta = (dia: number) =>
    new Intl.DateTimeFormat("es-UY", {
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(anio, mes - 1, dia)));

  return (
    <div className="flex flex-col gap-3">
      <div className="tarjeta p-4 sm:p-6">
        {/* En PC el calendario tiene ancho fijo y se centra; en el celular
            ocupa todo el ancho, si no las columnas se encogen a nada. */}
        <div className="mx-auto w-full sm:w-fit">
          <CalendarioMes
            dias={porDia}
            huecoInicial={huecoInicial}
            hoy={diaDeHoy}
            nombreMes={nombreMes}
            elegido={diaElegido}
            alElegir={setDiaElegido}
            destacado={mayorGasto?.dia ?? null}
          />

          {/* El mayor gasto, que además de informar filtra ese día. */}
          {mayorGasto && (
            <button
              type="button"
              onClick={() => setDiaElegido(mayorGasto.dia)}
              className="mt-4 flex w-full min-w-0 items-center gap-2 border-t border-borde pt-3.5 text-left text-xs text-suave transition-colors hover:text-texto"
              aria-label={`Ver el día del mayor gasto: ${mayorGasto.descripcion}, ${formatMoney(mayorGasto.monto, mayorGasto.moneda)}, día ${mayorGasto.dia}`}
            >
              {/* El mismo círculo que el día en el calendario. */}
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-alerta" />
              <span className="min-w-0 truncate">
                Mayor gasto: día {mayorGasto.dia} ·{" "}
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
        <p className="monto min-w-0 text-sm text-suave">
          {diaElegido !== null && (
            <button
              type="button"
              onClick={() => setDiaElegido(null)}
              className="mr-2 rounded-full bg-superficie-alta px-2.5 py-1 text-texto ring-1 ring-borde-fuerte transition-colors hover:bg-borde"
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
            className="campo w-auto rounded-full py-1.5 text-sm"
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
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Insignia nombre={g.categoria.nombre} color={g.categoria.color} emoji={g.categoria.emoji} />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium text-texto">
                  {g.descripcion || g.categoria.nombre}
                </p>
                <p className="mt-0.5 truncate text-xs text-tenue">
                  {fechaCorta(g.dia)} · {g.categoria.nombre}
                  {g.fijo && " · Gasto fijo"}
                  {g.grupo && ` · Grupo ${g.grupo}`}
                </p>
              </div>
            </div>
            <span
              className={`monto shrink-0 text-[15px] font-medium ${
                g.moneda === "UYU" ? "text-peso" : "text-dolar"
              }`}
            >
              {formatMoney(g.monto, g.moneda)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
