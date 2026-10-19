"use client";

import { useEffect, useRef } from "react";
import { formatMoney } from "@/lib/format";

export type GastoEnDetalle = {
  id: string;
  monto: number;
  moneda: "UYU" | "USD";
  fecha: string;
  descripcion: string | null;
  pagadorId: string;
  cargadoPorId: string;
  partes: { userId: string; monto: number }[];
};

/**
 * El detalle de un gasto del grupo, como en Tricount: se abre al tocar una
 * fila de la lista y muestra quién pagó, cuánto le toca a cada uno y quién lo
 * cargó. Desde acá se edita o se borra; la lista ya no lleva esos botones.
 *
 * Usa el mismo `<dialog>` nativo que Confirmar: foco atrapado, Escape cierra.
 */
export function DetalleGasto({
  gasto,
  seccion,
  yo,
  nombreDe,
  puedeEditar,
  motivoSinEdicion,
  alEditar,
  alEliminar,
  alCerrar,
}: {
  gasto: GastoEnDetalle | null;
  seccion: string | null;
  yo: string;
  nombreDe: (id: string) => string;
  /** Quien lo cargó o el administrador, y con el grupo abierto. */
  puedeEditar: boolean;
  /** Por qué no se puede editar, cuando no se puede. */
  motivoSinEdicion: string;
  alEditar: () => void;
  alEliminar: () => void;
  alCerrar: () => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogo.current;
    if (!el) return;
    if (gasto && !el.open) el.showModal();
    if (!gasto && el.open) el.close();
  }, [gasto]);

  const nombre = (id: string) => (id === yo ? "Vos" : nombreDe(id));
  const colorMoneda = gasto?.moneda === "USD" ? "text-dolar" : "text-peso";
  // Las partes de mayor a menor, y la mía primero si empata.
  const partes = gasto
    ? [...gasto.partes].sort((a, b) => b.monto - a.monto || Number(b.userId === yo) - Number(a.userId === yo))
    : [];
  const mayor = Math.max(0, ...partes.map((p) => p.monto));

  return (
    <dialog
      ref={dialogo}
      className="dialogo"
      aria-labelledby="detalle-titulo"
      onCancel={(e) => {
        e.preventDefault();
        alCerrar();
      }}
      // Tocar afuera del cuadro (en el fondo) también cierra.
      onClick={(e) => {
        if (e.target === e.currentTarget) alCerrar();
      }}
    >
      {gasto && (
        <div className="flex flex-col">
          <div className="flex items-start justify-between gap-3 px-5 pt-5">
            <div className="min-w-0">
              <h2 id="detalle-titulo" className="seccion-titulo truncate">
                {gasto.descripcion || "Gasto"}
              </h2>
              <p className="mt-1 text-xs text-tenue first-letter:uppercase">
                {new Intl.DateTimeFormat("es-UY", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                }).format(new Date(gasto.fecha))}
                {seccion && ` · ${seccion}`}
              </p>
            </div>
            <button type="button" onClick={alCerrar} aria-label="Cerrar" className="boton-mini -mt-1 -mr-2 shrink-0">
              <span aria-hidden>✕</span>
            </button>
          </div>

          <div className="mx-5 mt-4 flex items-baseline justify-between gap-3 rounded-2xl bg-fondo/60 px-4 py-3">
            <span className="text-sm text-suave">
              {gasto.pagadorId === yo ? "Pagaste vos" : `Pagó ${nombreDe(gasto.pagadorId)}`}
            </span>
            <span className={`monto text-xl font-semibold ${colorMoneda}`}>
              {formatMoney(gasto.monto, gasto.moneda)}
            </span>
          </div>

          <div className="px-5 pt-4">
            <p className="text-xs font-medium text-tenue">
              {partes.length === 1 ? "Para" : `Para ${partes.length} personas`}
            </p>
            <ul className="mt-2 flex flex-col gap-2.5">
              {partes.map((p) => (
                <li key={p.userId} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className={p.userId === yo ? "font-medium text-texto" : "text-suave"}>
                      {nombre(p.userId)}
                    </span>
                    <span className="monto text-texto">{formatMoney(p.monto, gasto.moneda)}</span>
                  </div>
                  {/* cuánto se lleva cada uno, en la misma escala */}
                  <span aria-hidden className="block h-1 overflow-hidden rounded-full bg-borde">
                    <span
                      className={`block h-full rounded-full ${gasto.moneda === "USD" ? "bg-dolar" : "bg-peso"}`}
                      style={{ width: `${mayor > 0 ? (p.monto / mayor) * 100 : 0}%`, opacity: p.userId === yo ? 1 : 0.55 }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="px-5 pt-4 text-xs text-tenue">
            Lo cargó {gasto.cargadoPorId === yo ? "vos" : nombreDe(gasto.cargadoPorId)}.
          </p>

          <div className="mt-4 flex justify-end gap-2 border-t border-borde px-5 py-4">
            {puedeEditar ? (
              <>
                <button
                  type="button"
                  onClick={alEliminar}
                  className="boton-linea mr-auto hover:border-alerta hover:text-alerta"
                >
                  Eliminar
                </button>
                <button type="button" onClick={alEditar} className="boton">
                  Editar
                </button>
              </>
            ) : (
              <>
                <p className="mr-auto self-center text-xs text-tenue">{motivoSinEdicion}</p>
                <button type="button" onClick={alCerrar} className="boton-linea">
                  Cerrar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
