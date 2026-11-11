"use client";

import { useState } from "react";
import { NuevoGasto, origenDe, type Origen } from "@/components/NuevoGasto";

/**
 * Un botón suelto que abre la ventana de nuevo gasto, con el mismo gesto que
 * el + del celular y el "Cargar gasto" de la cabecera: la ventana nace del
 * botón. Sirve donde la página invita a cargar algo, como el vacío del inicio,
 * para no mandar a otra página a buscar el formulario.
 */
export function BotonNuevoGasto({
  texto,
  className = "boton",
}: {
  texto: string;
  className?: string;
}) {
  const [origen, setOrigen] = useState<Origen | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={(e) => setOrigen(origenDe(e.currentTarget))}
        aria-haspopup="dialog"
        className={className}
      >
        {texto}
      </button>

      {origen && <NuevoGasto origen={origen} alCerrar={() => setOrigen(null)} />}
    </>
  );
}
