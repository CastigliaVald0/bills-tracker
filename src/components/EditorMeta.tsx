"use client";

import { useEffect, useRef, useState } from "react";
import { Aviso, enfocarCampoConError } from "@/components/Aviso";
import { CampoMonto } from "@/components/CamposGasto";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "@/lib/format";

/**
 * Poner, cambiar o sacar la meta de ahorro del grupo, en pesos o en dólares
 * (con el mismo campo de monto que un gasto). Solo lo abre el administrador.
 * Sacar la meta no borra los aportes: si se vuelve a poner, siguen ahí. Con
 * aportes anotados la moneda queda fija, para no mezclar pesos con dólares.
 */
export function EditorMeta({
  grupoId,
  actual,
  monedaActual,
  hayAportes,
  personas,
  alCerrar,
  alGuardar,
}: {
  grupoId: string;
  /** La meta que tiene hoy; null si todavía no tiene. */
  actual: number | null;
  monedaActual: "UYU" | "USD";
  /** Si ya hay aportes anotados: entonces la moneda no se puede cambiar. */
  hayAportes: boolean;
  /** Cuántos integrantes hay, para mostrar cuánto le toca a cada uno. */
  personas: number;
  alCerrar: () => void;
  alGuardar: (aviso: string) => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [monto, setMonto] = useState(actual ? formatMoneyInput(String(actual).replace(".", ",")) : "");
  const [moneda, setMoneda] = useState<"UYU" | "USD">(monedaActual);
  const [monedaFija, setMonedaFija] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    dialogo.current?.showModal();
  }, []);

  const numero = parseMoneyInput(monto);
  const valido = Number.isFinite(numero) && numero > 0;

  async function guardar(metaMonto: number | null) {
    if (ocupado) return;
    setError(null);
    setOcupado(true);
    try {
      const res = await fetch(`/api/grupos/${grupoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metaMonto === null ? { metaMonto } : { metaMonto, metaMoneda: moneda }),
      });
      const datos = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(datos.error ?? "No se pudo guardar la meta.");
        return;
      }
      alGuardar(metaMonto === null ? "Meta sacada." : `Meta de ${formatMoney(metaMonto, moneda)} guardada.`);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <dialog
      ref={dialogo}
      className="dialogo"
      aria-labelledby="editor-meta-titulo"
      onCancel={(e) => {
        e.preventDefault();
        alCerrar();
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!valido) {
            setError("Escribí un monto mayor que cero.");
            enfocarCampoConError("monto-meta");
            return;
          }
          guardar(numero);
        }}
        className="flex flex-col gap-4 p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="editor-meta-titulo" className="seccion-titulo">
              {actual ? "Cambiar la meta" : "Poner una meta"}
            </h2>
            <p className="mt-1 text-sm text-suave">Cuánto quieren juntar entre todos.</p>
          </div>
          <button type="button" onClick={alCerrar} aria-label="Cerrar" className="boton-mini -mr-2 -mt-1">
            <span aria-hidden>✕</span>
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <CampoMonto
            id="monto-meta"
            idError={error ? "error-meta" : undefined}
            monto={monto}
            alCambiarMonto={setMonto}
            moneda={moneda}
            alCambiarMoneda={(nueva) => {
              // Con aportes en una moneda, la meta no puede pasar a la otra.
              if (hayAportes && nueva !== monedaActual) setMonedaFija(true);
              else setMoneda(nueva);
            }}
            nombreGrupo="moneda-meta"
          />
          <p className={`text-xs ${monedaFija ? "text-alerta" : "text-tenue"}`}>
            {monedaFija
              ? `Ya hay aportes en ${monedaActual === "UYU" ? "pesos" : "dólares"}: para cambiar la moneda, primero hay que borrarlos.`
              : valido && personas > 1
                ? `Entre ${personas}: ${formatMoney(numero / personas, moneda)} cada uno.`
                : "Ej: lo que cuesta el viaje."}
          </p>
        </div>

        {error && <Aviso id="error-meta" tono="error">{error}</Aviso>}

        <div className="flex items-center justify-end gap-2 border-t border-borde pt-4">
          {actual !== null && (
            <button
              type="button"
              onClick={() => guardar(null)}
              disabled={ocupado}
              className="boton-linea mr-auto hover:border-alerta hover:text-alerta"
            >
              Sacar la meta
            </button>
          )}
          <button type="button" onClick={alCerrar} className="boton-linea">
            Cancelar
          </button>
          <button type="submit" disabled={ocupado} className="boton">
            {ocupado ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
