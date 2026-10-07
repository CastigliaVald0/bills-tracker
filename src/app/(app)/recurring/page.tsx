"use client";

import { useEffect, useState } from "react";
import type { Category, RecurringExpense } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { Vacio, IconoCalendario } from "@/components/Vacio";
import { CampoMonto, CampoCategoria, Conmutador } from "@/components/CamposGasto";
import Link from "next/link";
import {
  monthYearLabel,
  dateToMonthInput,
  primerMesDeCobro,
  mesFinalDeCuotas,
  currentMonthStart,
  progresoDeCuotas,
  diaDeCobroYaPaso,
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
  // "siempre" = alquiler, abono, suscripción. "cuotas" = una compra financiada.
  const [tipo, setTipo] = useState<"siempre" | "cuotas">("siempre");
  const [cuotas, setCuotas] = useState("12");

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
        endsOn: mesFinal ? dateToMonthInput(mesFinal) : null,
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
    setTipo("siempre");
    setCuotas("12");
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

  // El día elegido ya pasó, así que al guardar se genera el gasto de este mes.
  const cobraEsteMes = diaDeCobroYaPaso(Number(dayOfMonth) || 0);

  // De cuotas a meses: el usuario escribe "12" y la app resuelve en qué mes
  // termina, que es la cuenta donde antes era fácil errarle por uno.
  const dia = Number(dayOfMonth) || 1;
  const cantidadCuotas = Number(cuotas);
  const mesFinal = tipo === "cuotas" ? mesFinalDeCuotas(cantidadCuotas, dia) : null;
  const primerMes = primerMesDeCobro(dia);

  const montoCuota = Number(amount);
  const totalFinanciado =
    mesFinal && montoCuota > 0 ? montoCuota * cantidadCuotas : null;

  const resumen =
    tipo === "siempre"
      ? "Se repite todos los meses, sin fecha de fin."
      : mesFinal
        ? `${cantidadCuotas} ${cantidadCuotas === 1 ? "cuota" : "cuotas"}, de ${monthYearLabel(primerMes)} a ${monthYearLabel(mesFinal)}.`
        : "Escribí en cuántas cuotas se paga.";

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="rotulo">Se cargan solos cada mes</p>
        <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-texto">Gastos fijos</h1>
      </header>

      <form onSubmit={handleCreate} className="tarjeta flex flex-col gap-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="rotulo">Nuevo gasto fijo</p>
          {/* El tipo va arriba de todo porque decide qué más se pregunta. */}
          <Conmutador
            nombreGrupo="tipo-fijo"
            etiqueta="Tipo de gasto fijo"
            valor={tipo}
            alCambiar={setTipo}
            opciones={[
              { valor: "siempre", texto: "Siempre" },
              { valor: "cuotas", texto: "En cuotas" },
            ]}
          />
        </div>

        <CampoMonto
          id="monto-fijo"
          monto={amount}
          alCambiarMonto={setAmount}
          moneda={currency}
          alCambiarMoneda={setCurrency}
          nombreGrupo="moneda-fijo"
        />

        <CampoCategoria
          categorias={categories}
          valor={categoryId}
          alCambiar={setCategoryId}
          nombreGrupo="categoria-fijo"
        />

        {/* Cuándo cobra y, si va en cuotas, cuántas. El resumen de abajo
            traduce las dos cosas a meses concretos antes de guardar. */}
        <div>
          <div className="flex flex-wrap gap-4">
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

            {tipo === "cuotas" && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cuotas" className="rotulo">Cuotas</label>
                <input
                  id="cuotas"
                  type="number"
                  min="1"
                  max="120"
                  step="1"
                  inputMode="numeric"
                  value={cuotas}
                  onChange={(e) => setCuotas(e.target.value)}
                  required
                  className="campo monto w-24"
                />
              </div>
            )}
          </div>

          <p className="mt-2 text-xs text-tenue">
            {resumen}
            {totalFinanciado !== null && (
              <>
                {" "}
                Total:{" "}
                <span className="monto text-suave">
                  {formatMoney(totalFinanciado, currency)}
                </span>
                .
              </>
            )}
          </p>

          {cobraEsteMes && (
            <p className="mt-1 text-xs text-tenue">
              El día {dia} de este mes ya pasó: la primera se carga al guardar.
            </p>
          )}
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

        {categories.length === 0 && !loading && (
          <p className="text-sm text-suave">
            Necesitás al menos una categoría para cargar un gasto fijo.{" "}
            <Link href="/categories" className="text-peso underline underline-offset-2">
              Crear una
            </Link>
          </p>
        )}

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
          <Vacio
            icono={<IconoCalendario />}
            titulo="Sin gastos fijos"
            detalle="El alquiler, el abono del celular, una suscripción. Cargalos una vez arriba y se generan solos cada mes, el día que elijas."
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
                <div key={item.id} className={`fila ${atenuado ? "opacity-55" : ""}`}>
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span aria-hidden className="filete" style={{ backgroundColor: item.category.color }} />
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
                          <span className="rotulo truncate normal-case tracking-normal">
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
