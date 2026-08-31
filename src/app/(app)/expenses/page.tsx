"use client";

import { useEffect, useState } from "react";
import type { Category, Expense } from "@/lib/types";
import { formatMoney, currentMonth } from "@/lib/format";

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
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Gastos del mes</h1>

      <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Monto"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as "UYU" | "USD")}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="UYU">UYU</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        <input
          type="text"
          placeholder="Descripción (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={categories.length === 0}
          className="self-start rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
        >
          Cargar gasto
        </button>
        {categories.length === 0 && !loading && (
          <p className="text-xs text-slate-500">Creá primero una categoría para poder cargar gastos.</p>
        )}
      </form>

      {loading ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : expenses.length === 0 ? (
        <p className="text-sm text-slate-500">Todavía no cargaste gastos este mes.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: expense.category.color }} />
                <div>
                  <p className="text-sm text-slate-900 dark:text-slate-100">
                    {expense.description || expense.category.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Intl.DateTimeFormat("es-UY", { day: "2-digit", month: "short" }).format(new Date(expense.date))}
                    {" · "}
                    {expense.category.name}
                    {expense.recurringExpenseId && " · fijo"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {formatMoney(expense.amount, expense.currency)}
                </span>
                <button
                  onClick={() => handleDelete(expense.id)}
                  className="text-xs text-slate-400 hover:text-red-600"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
