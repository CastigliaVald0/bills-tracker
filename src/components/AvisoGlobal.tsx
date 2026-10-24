"use client";

import { useEffect } from "react";
import { Aviso, useAvisoTemporal } from "@/components/Aviso";
import { EVENTO_GASTO_CARGADO } from "@/components/NuevoGasto";

/**
 * La confirmación de la ventana del +: la ventana se cierra al guardar, así
 * que el "Gasto cargado" se muestra flotando sobre la página que haya quedado
 * abajo, en cualquier pantalla. En el celular va encima de la barra.
 */
export function AvisoGlobal() {
  const [aviso, mostrarAviso] = useAvisoTemporal();

  useEffect(() => {
    function alCargar(e: Event) {
      const { mensaje } = (e as CustomEvent<{ mensaje: string }>).detail;
      mostrarAviso(mensaje);
    }
    window.addEventListener(EVENTO_GASTO_CARGADO, alCargar);
    return () => window.removeEventListener(EVENTO_GASTO_CARGADO, alCargar);
  }, [mostrarAviso]);

  if (!aviso) return null;
  return (
    <div className="aviso-flotante fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-full border border-borde bg-superficie-alta px-4 py-2.5 shadow-[var(--sombra-flotante)] sm:bottom-6">
      <Aviso tono="ok">{aviso}</Aviso>
    </div>
  );
}
