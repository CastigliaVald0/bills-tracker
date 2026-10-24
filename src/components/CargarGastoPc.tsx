"use client";

import { useState } from "react";
import { NuevoGasto, origenDe, type Origen } from "@/components/NuevoGasto";

/**
 * El botón "Cargar gasto" de la cabecera de PC. Es el mismo gesto que el + de
 * la barra del celular (BotonAgregar): abre la ventana de nuevo gasto, que se
 * expande desde el botón y deja elegir adentro si es común, fijo o grupal.
 */
export function CargarGastoPc() {
  const [origen, setOrigen] = useState<Origen | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={(e) => setOrigen(origenDe(e.currentTarget))}
        aria-haspopup="dialog"
        className="boton py-1.5"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="h-4 w-4"
          aria-hidden
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Cargar gasto
      </button>

      {origen && <NuevoGasto origen={origen} alCerrar={() => setOrigen(null)} />}
    </>
  );
}
