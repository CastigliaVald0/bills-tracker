"use client";

import { useState } from "react";
import { NuevoGasto, origenDe, type Origen } from "@/components/NuevoGasto";

/**
 * El botón central de la barra flotante. Al tocarlo se abre la ventana de
 * nuevo gasto (NuevoGasto), que nace del propio botón y deja elegir adentro
 * si el gasto es común, fijo o grupal. Mientras está abierta, el + gira y
 * pasa a ser una ×.
 */
export function BotonAgregar() {
  const [origen, setOrigen] = useState<Origen | null>(null);
  const abierto = origen !== null;

  return (
    <div className="boton-central absolute left-1/2 top-1/2 h-16 w-16">
      <button
        type="button"
        onClick={(e) => setOrigen(origenDe(e.currentTarget))}
        aria-label="Agregar gasto"
        title="Agregar gasto"
        aria-haspopup="dialog"
        className="relative flex h-full w-full items-center justify-center rounded-full bg-accion text-accion-texto shadow-lg shadow-black/25 transition-colors hover:bg-accion-alta"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          className={`h-7 w-7 transition-transform duration-300 ${abierto ? "rotate-45" : ""}`}
          aria-hidden
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {origen && <NuevoGasto origen={origen} alCerrar={() => setOrigen(null)} />}
    </div>
  );
}
