"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";
import type { UsdRate } from "@/lib/exchange-rate";

export function CurrencyConverter({ rate }: { rate: UsdRate | null }) {
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"USD_TO_UYU" | "UYU_TO_USD">("USD_TO_UYU");

  if (!rate) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
        No se pudo obtener la cotización del dólar en este momento.
      </div>
    );
  }

  const numericAmount = Number(amount);
  const hasAmount = amount !== "" && Number.isFinite(numericAmount);
  const converted = hasAmount
    ? direction === "USD_TO_UYU"
      ? numericAmount * rate.venta
      : numericAmount / rate.venta
    : null;

  const dateLabel = rate.date
    ? new Intl.DateTimeFormat("es-UY", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
        new Date(`${rate.date}T00:00:00`)
      )
    : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Conversor UYU / USD</p>
        <button
          type="button"
          onClick={() => setDirection((d) => (d === "USD_TO_UYU" ? "UYU_TO_USD" : "USD_TO_UYU"))}
          className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
        >
          {direction === "USD_TO_UYU" ? "USD → UYU" : "UYU → USD"} ⇄
        </button>
      </div>

      <p className="mt-1 text-xs text-slate-500">
        Cotización {rate.source}
        {dateLabel ? ` al ${dateLabel}` : ""}: compra {formatMoney(rate.compra, "UYU")} · venta{" "}
        {formatMoney(rate.venta, "UYU")}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder={direction === "USD_TO_UYU" ? "Monto en USD" : "Monto en UYU"}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        <span className="shrink-0 text-sm text-slate-500">
          =
          <span className="ml-2 font-medium text-slate-900 dark:text-slate-100">
            {converted !== null
              ? formatMoney(converted, direction === "USD_TO_UYU" ? "UYU" : "USD")
              : "—"}
          </span>
        </span>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {rate.source === "BROU"
          ? "Calculado con la cotización de venta de la pizarra del BROU, sujeta a confirmación: no es un valor exacto y tu banco o tarjeta puede aplicar un tipo de cambio distinto."
          : "No se pudo leer la pizarra del BROU, así que se muestra la cotización oficial del BCU (se publica con atraso). No es un valor exacto: tu banco o tarjeta puede aplicar un tipo de cambio distinto."}
      </p>
    </div>
  );
}
