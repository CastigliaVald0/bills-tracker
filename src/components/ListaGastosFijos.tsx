"use client";

import { Insignia } from "@/components/Insignia";
import { useEffect, useState } from "react";
import type { RecurringExpense } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { Vacio, IconoCalendario } from "@/components/Vacio";
import { EVENTO_GASTO_CARGADO } from "@/components/NuevoGasto";
import { Aviso, useAvisoTemporal } from "@/components/Aviso";
import { EsqueletoLista } from "@/components/Esqueleto";
import { Confirmar } from "@/components/Confirmar";
import { currentMonthStart, progresoDeCuotas } from "@/lib/month";

/** La pestaña "Fijos" de Gastos: los que se generan solos, con pausar y eliminar. */
export function ListaGastosFijos() {
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [aviso, mostrarAviso] = useAvisoTemporal();
  // El gasto fijo que el diálogo está por eliminar.
  const [porEliminar, setPorEliminar] = useState<RecurringExpense | null>(null);

  async function load() {
    const res = await fetch("/api/recurring");
    const datos: RecurringExpense[] = await res.json();
    setRecurring(datos);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, []);

  async function handleToggle(item: RecurringExpense) {
    await fetch(`/api/recurring/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !item.active }),
    });
    load();
  }

  async function handleDelete(item: RecurringExpense) {
    setPorEliminar(null);
    await fetch(`/api/recurring/${item.id}`, { method: "DELETE" });
    mostrarAviso("Gasto fijo eliminado.");
    load();
  }

  // Lo creado desde la ventana del + aparece sin recargar la página.
  useEffect(() => {
    function alCargar(e: Event) {
      if ((e as CustomEvent<{ tipo: string }>).detail.tipo === "fijo") load();
    }
    window.addEventListener(EVENTO_GASTO_CARGADO, alCargar);
    return () => window.removeEventListener(EVENTO_GASTO_CARGADO, alCargar);
  }, []);

  return (
    <>
      <section>
        {aviso && (
          <div className="mb-3">
            <Aviso tono="ok">{aviso}</Aviso>
          </div>
        )}
        {loading ? (
          <EsqueletoLista />
        ) : recurring.length === 0 ? (
          <Vacio
            icono={<IconoCalendario />}
            titulo="Sin gastos fijos"
            detalle="El alquiler, el abono del celular, una suscripción. Cargalos una vez con el + y se generan solos cada mes, el día que elijas."
          />
        ) : (
          <div className="lista">
            {recurring.map((item) => {
              const finaliza = item.endsOn ? new Date(item.endsOn) : null;
              const finalizado = finaliza !== null && finaliza < currentMonthStart();
              const atenuado = !item.active || finalizado;

              // Un gasto con fin es una compra en cuotas: interesa en cuál va,
              // no en qué mes termina.
              const progreso = finaliza
                ? progresoDeCuotas({
                    createdAt: new Date(item.createdAt),
                    dayOfMonth: item.dayOfMonth,
                    endsOn: finaliza,
                  })
                : null;

              return (
                <div key={item.id} className="fila">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Insignia nombre={item.category.name} color={item.category.color} emoji={item.category.emoji} />
                    <div className="min-w-0">
                      <p
                        className={`truncate text-[15px] font-medium ${
                          atenuado ? "text-apagado line-through" : "text-texto"
                        }`}
                      >
                        {item.description || item.category.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-tenue">
                        Día {item.dayOfMonth} · {item.category.name}
                      </p>

                      {/* El progreso va en su propio renglón y no pegado a la
                          categoría: en el celular no entraban los dos juntos y
                          se cortaba justo el dato de las cuotas. */}
                      {progreso && (
                        <span className="mt-1.5 flex items-center gap-2">
                          {!finalizado && (
                            <span
                              aria-hidden
                              className="h-[3px] w-14 shrink-0 overflow-hidden rounded-full bg-borde sm:w-24"
                            >
                              <span
                                className="block h-full rounded-full"
                                style={{
                                  width: `${(progreso.actual / progreso.total) * 100}%`,
                                  backgroundColor: item.category.color,
                                }}
                              />
                            </span>
                          )}
                          <span className="truncate text-xs text-tenue">
                            {finalizado
                              ? `${progreso.total} cuotas, terminado`
                              : progreso.actual === 0
                                ? `0 de ${progreso.total} cuotas`
                                : `cuota ${progreso.actual} de ${progreso.total}`}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 sm:gap-4">
                    <span className="monto text-sm text-texto">
                      {formatMoney(item.amount, item.currency)}
                    </span>
                    {!finalizado && (
                      <button onClick={() => handleToggle(item)} className="boton-mini">
                        {item.active ? "Pausar" : "Reactivar"}
                      </button>
                    )}
                    <button
                      onClick={() => setPorEliminar(item)}
                      className="boton-mini boton-mini-peligro"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Confirmar
        abierto={porEliminar !== null}
        titulo="¿Eliminar este gasto fijo?"
        detalle={
          porEliminar
            ? `Se deja de generar "${porEliminar.description || porEliminar.category.name}" todos los meses. Los gastos que ya generó no se borran.`
            : ""
        }
        textoConfirmar="Eliminar"
        alConfirmar={() => porEliminar && handleDelete(porEliminar)}
        alCancelar={() => setPorEliminar(null)}
      />
    </>
  );
}
