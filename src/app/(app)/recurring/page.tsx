"use client";

import { useEffect, useState } from "react";
import type { Category, RecurringExpense } from "@/lib/types";
import { formatMoney } from "@/lib/format";

export default function RecurringPage() {
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"UYU" | "USD">("UYU");
  const [categoryId, setCategoryId] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [description, setDescription] = useState("");

  async function load() {
    const [recurringRes, categoriesRes] = await Promise.all([
      fetch("/api/recurring"),
      fetch("/api/categories"),
    ]);
    const recurringData: RecurringExpense[] = await recurringRes.json();
    const categoriesData: Category[] = await categoriesRes.json();
    setRecurring(recurringData);
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
    const res = await fetch("/api/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(amount),
        currency,
        categoryId,
        dayOfMonth: Number(dayOfMonth),
        description: description || undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo crear el gasto fijo");
      return;
    }
    setAmount("");
    setDescription("");
    setDayOfMonth("1");
    load();
  }

  async function handleToggle(item: RecurringExpense) {
    await fetch(`/api/recurring/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !item.active }),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este gasto fijo?")) return;
    await fetch(`/api/recurring/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Gastos fijos</h1>
        <p className="text-sm text-slate-500">Se cargan solos cada mes en el día que elijas.</p>
      </div>

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
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">Día del mes</label>
          <input
            type="number"
            min="1"
            max="28"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            required
            className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <input
          type="text"
          placeholder="Descripción (ej: Alquiler)"
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
          Agregar gasto fijo
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : recurring.length === 0 ? (
        <p className="text-sm text-slate-500">Todavía no tenés gastos fijos configurados.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {recurring.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.category.color }} />
                <div>
                  <p className={`text-sm ${item.active ? "text-slate-900 dark:text-slate-100" : "text-slate-400 line-through"}`}>
                    {item.description || item.category.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    Día {item.dayOfMonth} · {item.category.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {formatMoney(item.amount, item.currency)}
                </span>
                <button onClick={() => handleToggle(item)} className="text-xs text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                  {item.active ? "Pausar" : "Reactivar"}
                </button>
                <button onClick={() => handleDelete(item.id)} className="text-xs text-slate-400 hover:text-red-600">
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
