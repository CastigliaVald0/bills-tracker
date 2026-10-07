"use client";

import { useEffect, useState } from "react";
import type { Category, Expense } from "@/lib/types";
import { Vacio, IconoTicket } from "@/components/Vacio";
import { CampoMonto, CampoCategoria } from "@/components/CamposGasto";
import Link from "next/link";
import { formatMoney, currentMonth, monthLabel } from "@/lib/format";

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(amount),
        currency,
        categoryId,
        date: new Date(date).toISOString(),
        description: description || undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo cargar el gasto");
      return;
    }
    setAmount("");
    setDescription("");
    setDate(todayIso());
    load();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
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

        {error && <p className="text-sm text-alerta">{error}</p>}

        <div className="flex justify-end border-t border-borde pt-4">
          <button type="submit" disabled={categories.length === 0} className="boton">
            Cargar gasto
          </button>
        </div>
      </form>

      <section>
        <h2 className="rotulo mb-3">Cargados este mes</h2>
        {loading ? (
          <p className="tarjeta px-4 py-6 text-center text-sm text-suave">Cargando...</p>
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
                    onClick={() => handleDelete(expense.id)}
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
