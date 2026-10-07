"use client";

import { useEffect, useRef } from "react";

/**
 * El cartel de "¿seguro?" para lo que no se puede deshacer.
 *
 * Reemplaza al `confirm()` del navegador, que rompía la estética y además
 * congela el hilo mientras está abierto. Usa el `<dialog>` nativo, así el foco
 * queda atrapado adentro, Escape cierra y el fondo se vuelve inerte sin tener
 * que programar nada de eso a mano.
 */
export function Confirmar({
  abierto,
  titulo,
  detalle,
  textoConfirmar,
  alConfirmar,
  alCancelar,
}: {
  abierto: boolean;
  titulo: string;
  detalle: string;
  textoConfirmar: string;
  alConfirmar: () => void;
  alCancelar: () => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogo.current;
    if (!el) return;
    if (abierto && !el.open) el.showModal();
    if (!abierto && el.open) el.close();
  }, [abierto]);

  return (
    <dialog
      ref={dialogo}
      className="dialogo"
      aria-labelledby="dialogo-titulo"
      // Escape dispara 'cancel': se frena para cerrar por el mismo camino que
      // el botón y no dejar el estado del padre desincronizado.
      onCancel={(e) => {
        e.preventDefault();
        alCancelar();
      }}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1.5">
          <h2 id="dialogo-titulo" className="text-sm font-semibold text-texto">
            {titulo}
          </h2>
          <p className="text-sm leading-relaxed text-suave">{detalle}</p>
        </div>

        <div className="flex justify-end gap-2 border-t border-borde pt-4">
          <button type="button" onClick={alCancelar} className="boton-linea">
            Cancelar
          </button>
          <button type="button" onClick={alConfirmar} className="boton boton-peligro">
            {textoConfirmar}
          </button>
        </div>
      </div>
    </dialog>
  );
}
