"use client";

import { useEffect, useState } from "react";
import type { Category, RecurringExpense } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import {
  monthYearLabel,
  monthInputToDate,
  dateToMonthInput,
  countInstallments,
  currentMonthStart,
} from "@/lib/month";

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
  const [endsOn, setEndsOn] = useState("");

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
        endsOn: endsOn || null,
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
    setEndsOn("");
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

  // Ayuda en vivo: traduce el mes elegido a una cantidad de cuotas.
  const fechaFin = endsOn ? monthInputToDate(endsOn) : null;
  const cuotas = fechaFin ? countInstallments(fechaFin, Number(dayOfMonth) || 1) : 0;
  const textoCuotas = !fechaFin
    ? "Vacío = se repite sin fin, como un alquiler."
    : cuotas > 0
      ? `${cuotas} ${cuotas === 1 ? "cuota" : "cuotas"}, la última en ${monthYearLabel(fechaFin)}.`
      : "Ese mes ya pasó.";

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="rotulo">Se cargan solos cada mes</p>
        <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-texto">Gastos fijos</h1>
      </header>

      <form onSubmit={handleCreate} className="tarjeta flex flex-col gap-4 p-4 sm:p-5">
        <p className="rotulo">Nuevo gasto fijo</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="monto-fijo" className="rotulo">Monto</label>
            <div className="flex gap-2">
              <input
                id="monto-fijo"
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
            <label htmlFor="dia" className="rotulo">Día del mes</label>
            <input
              id="dia"
              type="number"
              min="1"
              max="28"
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
              required
              className="campo monto w-24"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="categoria-fijo" className="rotulo">Categoría</label>
            <select
              id="categoria-fijo"
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
            <label htmlFor="descripcion-fijo" className="rotulo">Descripción</label>
            <input
              id="descripcion-fijo"
              type="text"
              placeholder="Ej: Alquiler"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="campo"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="hasta-fijo" className="rotulo">Hasta (opcional)</label>
            <input
              id="hasta-fijo"
              type="month"
              min={dateToMonthInput(currentMonthStart())}
              value={endsOn}
              onChange={(e) => setEndsOn(e.target.value)}
              className="campo monto"
            />
            <p className="text-xs text-tenue">{textoCuotas}</p>
          </div>
        </div>

        {error && <p className="text-sm text-alerta">{error}</p>}

        <div className="flex justify-end border-t border-borde pt-4">
          <button type="submit" disabled={categories.length === 0} className="boton">
            Agregar gasto fijo
          </button>
        </div>
      </form>

      <section>
        <h2 className="rotulo mb-3">Activos y pausados</h2>
        {loading ? (
          <p className="tarjeta px-4 py-6 text-center text-sm text-suave">Cargando...</p>
        ) : recurring.length === 0 ? (
          <p className="tarjeta px-4 py-6 text-center text-sm text-suave">
            Todavía no tenés gastos fijos configurados.
          </p>
        ) : (
          <div className="lista">
            {recurring.map((item) => {
              const finaliza = item.endsOn ? new Date(item.endsOn) : null;
              const finalizado = finaliza !== null && finaliza < currentMonthStart();
              const atenuado = !item.active || finalizado;

              return (
                <div key={item.id} className={`fila ${atenuado ? "opacity-55" : ""}`}>
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className="punto" style={{ backgroundColor: item.category.color }} />
                    <div className="min-w-0">
                      <p
                        className={`truncate text-sm ${
                          atenuado ? "text-suave line-through" : "text-texto"
                        }`}
                      >
                        {item.description || item.category.name}
                      </p>
                      <p className="rotulo mt-1 truncate normal-case tracking-normal">
                        Día {item.dayOfMonth} · {item.category.name}
                        {finaliza &&
                          (finalizado
                            ? " · finalizado"
                            : ` · hasta ${monthYearLabel(finaliza)}`)}
                      </p>
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
                      onClick={() => handleDelete(item.id)}
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
    </div>
  );
}
