"use client";

import { useEffect, useRef, useState } from "react";
import type { Category } from "@/lib/types";
import { EditorCategoria } from "@/components/EditorCategoria";
import { Aviso } from "@/components/Aviso";

/** Con qué color arranca: el mismo que en la página de categorías. */
const COLOR_INICIAL = "#3b82f6";

/**
 * Crear una categoría personal sin salir del formulario de un gasto: se abre
 * encima, con el mismo editor que la página de categorías, y al guardarla
 * vuelve al gasto con la nueva ya elegida.
 */
export function NuevaCategoria({
  alCerrar,
  alCrear,
}: {
  alCerrar: () => void;
  alCrear: (categoria: Category) => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState(COLOR_INICIAL);
  const [emoji, setEmoji] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    dialogo.current?.showModal();
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    // Este formulario vive adentro del del gasto: que el envío no siga de largo.
    e.stopPropagation();
    if (ocupado) return;
    setError(null);
    setOcupado(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nombre.trim(), color, emoji }),
      });
      const datos = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(datos.error ?? "No se pudo crear la categoría.");
        return;
      }
      alCrear({ id: datos.id, name: datos.name, color: datos.color, emoji: datos.emoji ?? null });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <dialog
      ref={dialogo}
      className="dialogo hoja"
      aria-labelledby="nueva-categoria-titulo"
      onCancel={(e) => {
        e.preventDefault();
        alCerrar();
      }}
    >
      <form onSubmit={guardar} className="flex max-h-[inherit] flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-borde px-5 py-4">
          <h2 id="nueva-categoria-titulo" className="seccion-titulo">Nueva categoría</h2>
          <button type="button" onClick={alCerrar} aria-label="Cerrar" className="boton-mini -mr-2">
            <span aria-hidden>✕</span>
          </button>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto px-5 py-5">
          <EditorCategoria
            id="nueva-categoria"
            placeholder="Ej: Regalos"
            nombre={nombre}
            alCambiarNombre={setNombre}
            color={color}
            alCambiarColor={setColor}
            emoji={emoji}
            alCambiarEmoji={setEmoji}
            idError={error ? "error-nueva-categoria" : undefined}
            maximoNombre={50}
          />
          {error && <Aviso id="error-nueva-categoria" tono="error">{error}</Aviso>}
        </div>

        <div className="flex justify-end gap-2 border-t border-borde px-5 py-4">
          <button type="button" onClick={alCerrar} className="boton-linea">
            Cancelar
          </button>
          <button type="submit" disabled={ocupado || nombre.trim() === ""} className="boton">
            {ocupado ? "Creando..." : "Crear y elegir"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
