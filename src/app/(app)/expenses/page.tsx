"use client";

import { useEffect, useRef, useState } from "react";
import type { Category, Expense } from "@/lib/types";
import { Vacio, IconoTicket } from "@/components/Vacio";
import { CampoMonto, CampoCategoria } from "@/components/CamposGasto";
import { Aviso, useAvisoTemporal, enfocarCampoConError } from "@/components/Aviso";
import { EsqueletoLista } from "@/components/Esqueleto";
import Link from "next/link";
import { formatMoney, currentMonth, monthLabel, parseMoneyInput } from "@/lib/format";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"UYU" | "USD">("UYU");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [aviso, mostrarAviso] = useAvisoTemporal();

  // El gasto que acaba de desaparecer de la lista y todavía se puede recuperar.
  const [borrado, setBorrado] = useState<Expense | null>(null);
  const esperandoBorrado = useRef<string | null>(null);
  const temporizadorBorrado = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    const [expensesRes, categoriesRes] = await Promise.all([
      fetch(`/api/expenses?month=${currentMonth()}`),
      fetch("/api/categories"),
    ]);
    const expensesData: Expense[] = await expensesRes.json();
    const categoriesData: Category[] = await categoriesRes.json();
    setExpenses(expensesData);
    setCategories(categoriesData);
    if (!categoryId && categoriesData.length > 0) setCategoryId(categoriesData[0].id);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    // Sin esta guarda, dos clics en una conexión lenta cargaban el gasto dos
    // veces. Es la misma que ya usaban login y cuenta.
    if (guardando) return;

    setError(null);

    // El campo ahora es de texto, así que la validación de monto se hace acá
    // en vez de dejársela al navegador.
    const montoNumerico = parseMoneyInput(amount);
    if (!Number.isFinite(montoNumerico) || montoNumerico <= 0) {
      setError("Escribí un monto mayor que cero.");
      enfocarCampoConError("monto");
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: montoNumerico,
          currency,
          categoryId,
          date: new Date(date).toISOString(),
          description: description || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo cargar el gasto");
        enfocarCampoConError("monto");
        return;
      }

      mostrarAviso(`Gasto de ${formatMoney(montoNumerico, currency)} cargado.`);
      setAmount("");
      setDescription("");
      setDate(todayIso());
      await load();
    } finally {
      setGuardando(false);
    }
  }

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
    <div className="flex flex-col gap-8">
      <header>
        <p className="rotulo">{monthLabel(currentMonth())}</p>
        <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-texto">Gastos del mes</h1>
      </header>

      <form onSubmit={handleCreate} className="tarjeta flex flex-col gap-5 p-4 sm:p-5">
        <p className="rotulo">Nuevo gasto</p>

        <CampoMonto
          id="monto"
          idError={error ? "error-gasto" : undefined}
          monto={amount}
          alCambiarMonto={setAmount}
          moneda={currency}
          alCambiarMoneda={setCurrency}
          nombreGrupo="moneda-gasto"
        />

        <CampoCategoria
          categorias={categories}
          valor={categoryId}
          alCambiar={setCategoryId}
          nombreGrupo="categoria-gasto"
        />

        {/* Fecha y descripción son los datos de ajuste: van abajo y en cuerpo
            normal, para que el monto y la categoría se lleven la atención. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fecha" className="rotulo">Fecha</label>
            <input
              id="fecha"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="campo monto"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="descripcion" className="rotulo">Descripción</label>
            <input
              id="descripcion"
              type="text"
              placeholder="Opcional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="campo"
            />
          </div>
        </div>

        {categories.length === 0 && !loading && (
          <p className="text-sm text-suave">
            Necesitás al menos una categoría para cargar un gasto.{" "}
            <Link href="/categories" className="text-peso underline underline-offset-2">
              Crear una
            </Link>
          </p>
        )}

        {error && <Aviso id="error-gasto" tono="error">{error}</Aviso>}

        <div className="flex flex-wrap items-center gap-3 border-t border-borde pt-4">
          {aviso && <Aviso tono="ok">{aviso}</Aviso>}
          <button
            type="submit"
            disabled={guardando || categories.length === 0}
            className="boton ml-auto"
          >
            {guardando ? "Cargando..." : "Cargar gasto"}
          </button>
        </div>
      </form>

      <section>
        <h2 className="rotulo mb-3">Cargados este mes</h2>

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
            detalle="Usá el formulario de arriba para cargar el primero. Van a aparecer acá, del más nuevo al más viejo."
          />
        ) : (
          <div className="lista">
            {expenses.map((expense) => (
              <div key={expense.id} className="fila">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span aria-hidden className="filete" style={{ backgroundColor: expense.category.color }} />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-texto">
                      {expense.description || expense.category.name}
                    </p>
                    <p className="rotulo mt-1 truncate normal-case tracking-normal">
                      {new Intl.DateTimeFormat("es-UY", { day: "2-digit", month: "short" }).format(new Date(expense.date))}
                      {" · "}
                      {expense.category.name}
                      {expense.recurringExpenseId && " · fijo"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 sm:gap-4">
                  <span className="monto text-sm text-texto">
                    {formatMoney(expense.amount, expense.currency)}
                  </span>
                  <button
                    onClick={() => handleDelete(expense)}
                    className="boton-mini boton-mini-peligro"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
