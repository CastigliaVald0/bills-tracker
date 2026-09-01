"use client";

import { useEffect, useState } from "react";
import type { Category, Expense } from "@/lib/types";
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

      <form onSubmit={handleCreate} className="tarjeta flex flex-col gap-4 p-4 sm:p-5">
        <p className="rotulo">Nuevo gasto</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="monto" className="rotulo">Monto</label>
            <div className="flex gap-2">
              <input
                id="monto"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="campo monto"
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as "UYU" | "USD")}
                aria-label="Moneda"
                className="campo monto w-auto shrink-0"
              >
                <option value="UYU">UYU</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

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
            <label htmlFor="categoria" className="rotulo">Categoría</label>
            <select
              id="categoria"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="campo"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
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

        {error && <p className="text-sm text-alerta">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borde pt-4">
          {categories.length === 0 && !loading ? (
            <p className="text-sm text-suave">Creá primero una categoría para poder cargar gastos.</p>
          ) : (
            <span />
          )}
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
          <p className="tarjeta px-4 py-6 text-center text-sm text-suave">
            Todavía no cargaste gastos este mes.
          </p>
        ) : (
          <div className="lista">
            {expenses.map((expense) => (
              <div key={expense.id} className="fila">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span className="punto" style={{ backgroundColor: expense.category.color }} />
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
