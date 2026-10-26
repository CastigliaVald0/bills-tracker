"use client";

import { Insignia } from "@/components/Insignia";
import { useEffect, useRef, useState } from "react";
import type { Expense } from "@/lib/types";
import { Vacio, IconoTicket } from "@/components/Vacio";
import { EVENTO_GASTO_CARGADO } from "@/components/NuevoGasto";
import { EsqueletoLista } from "@/components/Esqueleto";
import Link from "next/link";
import { formatMoney, currentMonth } from "@/lib/format";

/** La pestaña "Comunes" de Gastos: lo cargado este mes fuera de los grupos, con borrar y deshacer. */
export function ListaGastosMes() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // El gasto que acaba de desaparecer de la lista y todavía se puede recuperar.
  const [borrado, setBorrado] = useState<Expense | null>(null);
  const esperandoBorrado = useRef<string | null>(null);
  const temporizadorBorrado = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    const res = await fetch(`/api/expenses?month=${currentMonth()}`);
    const datos: Expense[] = await res.json();
    // La parte de un gasto grupal se ve en la pestaña Grupales, dentro de su grupo.
    setExpenses(datos.filter((e) => !e.grupo));
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, []);

  // Lo cargado desde la ventana del + aparece sin recargar la página.
  useEffect(() => {
    function alCargar(e: Event) {
      if ((e as CustomEvent<{ tipo: string }>).detail.tipo === "comun") load();
    }
    window.addEventListener(EVENTO_GASTO_CARGADO, alCargar);
    return () => window.removeEventListener(EVENTO_GASTO_CARGADO, alCargar);
  }, []);

  // Si se va de la página con un borrado a medio camino, se concreta.
  // `keepalive` deja que el pedido sobreviva a la navegación.
  useEffect(() => {
    const temporizador = temporizadorBorrado;
    const pendiente = esperandoBorrado;
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
      if (pendiente.current) {
        fetch(`/api/expenses/${pendiente.current}`, { method: "DELETE", keepalive: true });
      }
    };
  }, []);

  /** Manda el DELETE que estaba esperando, si hay alguno. */
  function confirmarBorradoPendiente() {
    const id = esperandoBorrado.current;
    if (!id) return;
    esperandoBorrado.current = null;
    fetch(`/api/expenses/${id}`, { method: "DELETE" });
  }

  /**
   * Borrar un gasto es frecuente, así que en vez de preguntar cada vez se
   * saca de la lista y se da unos segundos para arrepentirse. El DELETE recién
   * sale cuando se agota ese plazo: si se deshace, nunca llegó a pasar nada.
   */
  function handleDelete(expense: Expense) {
    if (temporizadorBorrado.current) clearTimeout(temporizadorBorrado.current);
    confirmarBorradoPendiente();

    setExpenses((previos) => previos.filter((e) => e.id !== expense.id));
    setBorrado(expense);
    esperandoBorrado.current = expense.id;

    temporizadorBorrado.current = setTimeout(() => {
      confirmarBorradoPendiente();
      setBorrado(null);
    }, 7000);
  }

  function deshacerBorrado() {
    if (temporizadorBorrado.current) clearTimeout(temporizadorBorrado.current);
    esperandoBorrado.current = null;
    setBorrado(null);
    load();
  }

  return (
    <>
      <section>

        {borrado && (
          <div
            role="status"
            className="tarjeta mb-3 flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <p className="text-sm text-suave">
              Borraste{" "}
              <span className="text-texto">
                {borrado.description || borrado.category.name}
              </span>
              , {formatMoney(borrado.amount, borrado.currency)}.
            </p>
            <button type="button" onClick={deshacerBorrado} className="boton-linea">
              Deshacer
            </button>
          </div>
        )}
        {loading ? (
          <EsqueletoLista />
        ) : expenses.length === 0 ? (
          <Vacio
            icono={<IconoTicket />}
            titulo="Ningún gasto cargado este mes"
            detalle="Tocá el + para cargar el primero. Van a aparecer acá, del más nuevo al más viejo."
          />
        ) : (
          <div className="lista">
            {expenses.map((expense) => (
              <div key={expense.id} className="fila">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Insignia nombre={expense.category.name} color={expense.category.color} emoji={expense.category.emoji} />
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-medium text-texto">
                      {expense.description || expense.category.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-tenue">
                      {new Intl.DateTimeFormat("es-UY", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(expense.date))}
                      {" · "}
                      {expense.category.name}
                      {expense.recurringExpenseId && " · Gasto fijo"}
                      {expense.grupo && ` · Grupo ${expense.grupo.nombre}`}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 sm:gap-4">
                  <span
                    className={`monto text-[15px] font-medium ${
                      expense.currency === "UYU" ? "text-peso" : "text-dolar"
                    }`}
                  >
                    {formatMoney(expense.amount, expense.currency)}
                  </span>
                  {/* La parte de un gasto de grupo se borra desde el grupo:
                      acá descuadraría las cuentas de los demás. */}
                  {expense.grupo ? (
                    <Link href={`/grupos/${expense.grupo.id}`} className="boton-mini">
                      Ver grupo
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleDelete(expense)}
                      className="boton-mini boton-mini-peligro"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
