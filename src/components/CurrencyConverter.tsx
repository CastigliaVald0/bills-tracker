"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";
import { ColumnaPizarra } from "@/components/Pizarra";
import { Vacio, IconoPizarra } from "@/components/Vacio";
import type { UsdRate } from "@/lib/exchange-rate";

export function CurrencyConverter({ rate }: { rate: UsdRate | null }) {
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"USD_TO_UYU" | "UYU_TO_USD">("USD_TO_UYU");

  if (!rate) {
    return (
      <Vacio
        icono={<IconoPizarra />}
        titulo="Sin cotización por ahora"
        detalle="No se pudo leer la pizarra de BROU ni la del BCU, y todavía no hay ninguna guardada. Probá de nuevo en un rato."
      />
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
    <div className="tarjeta overflow-hidden">
      {/* la pizarra de cotizaciones, tal cual se lee en la sucursal */}
      <div className="bg-pizarra px-4 py-4 sm:px-5">
        <p className="rotulo text-pizarra-suave">
          Pizarra {rate.source}
          {dateLabel ? ` · ${dateLabel}` : ""}
        </p>
        {/* Una cotización de ayer sirve; una de ayer disfrazada de hoy, no. */}
        {rate.vieja && (
          <p className="mt-1.5 text-xs text-pizarra-suave">
            No se pudo consultar la cotización ahora. Esta es la última que se
            leyó
            {rate.leidaEl
              ? `, el ${new Intl.DateTimeFormat("es-UY", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }).format(new Date(rate.leidaEl))}`
              : ""}
            .
          </p>
        )}
        <div className="mt-3 grid grid-cols-2 gap-4">
          <ColumnaPizarra escala="media" etiqueta="Compra" monto={formatMoney(rate.compra, "UYU")} />
          <ColumnaPizarra escala="media" etiqueta="Venta" monto={formatMoney(rate.venta, "UYU")} separador />
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rotulo">Convertir</span>
          <div
            role="group"
            aria-label="Sentido de la conversión"
            className="flex rounded border border-borde p-0.5"
          >
            <SegmentoDireccion
              activo={direction === "USD_TO_UYU"}
              onClick={() => setDirection("USD_TO_UYU")}
            >
              USD → UYU
            </SegmentoDireccion>
            <SegmentoDireccion
              activo={direction === "UYU_TO_USD"}
              onClick={() => setDirection("UYU_TO_USD")}
            >
              UYU → USD
            </SegmentoDireccion>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="monto-convertir" className="rotulo">
            {direction === "USD_TO_UYU" ? "Monto en dólares" : "Monto en pesos"}
          </label>
          <input
            id="monto-convertir"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="campo monto"
          />
        </div>

        <div className="flex items-baseline justify-between gap-3 border-t border-borde pt-4">
          <span className="rotulo">Son</span>
          <span
            className={`monto font-light leading-none ${
              converted !== null ? "text-texto" : "text-tenue"
            }`}
            style={{ fontSize: "clamp(1.25rem, 6vw, 1.75rem)" }}
          >
            {converted !== null
              ? formatMoney(converted, direction === "USD_TO_UYU" ? "UYU" : "USD")
              : "—"}
          </span>
        </div>

        <p className="text-xs leading-relaxed text-tenue">
          {rate.source === "BROU"
            ? "Calculado con la cotización de venta de la pizarra del BROU, sujeta a confirmación: no es un valor exacto y tu banco o tarjeta puede aplicar un tipo de cambio distinto."
            : "No se pudo leer la pizarra del BROU, así que se muestra la cotización oficial del BCU (se publica con atraso). No es un valor exacto: tu banco o tarjeta puede aplicar un tipo de cambio distinto."}
        </p>
      </div>
    </div>
  );
}

function SegmentoDireccion({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`monto rounded-[3px] px-2.5 py-1.5 text-xs transition-colors ${
        activo
          ? "bg-accion text-accion-texto"
          : "text-suave hover:text-texto"
      }`}
    >
      {children}
    </button>
  );
}
