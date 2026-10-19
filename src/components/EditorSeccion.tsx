"use client";

import { useEffect, useRef, useState } from "react";
import { EditorCategoria } from "@/components/EditorCategoria";
import { Aviso } from "@/components/Aviso";
import { MAXIMO_NOMBRE_SECCION } from "@/lib/grupos";

export type SeccionEditable = { id: string; nombre: string; color: string | null; emoji: string | null };

/**
 * Crear o editar una sección del grupo, con el mismo editor que las
 * categorías: nombre, color y emoji. Las secciones son la categoría de los
 * gastos del grupo, compartida por todos sus integrantes.
 *
 * Sin color propio, la sección usa el del grupo: el editor arranca con ese
 * color y, si se guarda sin cambiarlo, la sección lo sigue heredando (si el
 * grupo cambia de color, ella también).
 */
export function EditorSeccion({
  grupoId,
  colorDelGrupo,
  seccion,
  alCerrar,
  alGuardar,
}: {
  grupoId: string;
  colorDelGrupo: string;
  /** La sección a editar; null para crear una nueva. */
  seccion: SeccionEditable | null;
  alCerrar: () => void;
  /** Se guardó: el texto para el aviso y la sección como quedó. */
  alGuardar: (aviso: string, seccion: SeccionEditable) => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [nombre, setNombre] = useState(seccion?.nombre ?? "");
  const [color, setColor] = useState((seccion?.color ?? colorDelGrupo).toLowerCase());
  const [emoji, setEmoji] = useState<string | null>(seccion?.emoji ?? null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    dialogo.current?.showModal();
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (ocupado) return;
    setError(null);
    setOcupado(true);
    try {
      // Igual al del grupo = sin color propio: sigue al grupo si cambia.
      const colorPropio = color === colorDelGrupo.toLowerCase() ? null : color;
      const res = await fetch(
        seccion ? `/api/grupos/${grupoId}/secciones/${seccion.id}` : `/api/grupos/${grupoId}/secciones`,
        {
          method: seccion ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre, color: colorPropio, emoji }),
        }
      );
      const datos = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(datos.error ?? "No se pudo guardar la sección.");
        return;
      }
      alGuardar(seccion ? `Sección «${nombre.trim()}» guardada.` : `Sección «${nombre.trim()}» agregada.`, {
        id: datos.id,
        nombre: datos.nombre,
        color: datos.color ?? null,
        emoji: datos.emoji ?? null,
      });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <dialog
      ref={dialogo}
      className="dialogo hoja"
      aria-labelledby="editor-seccion-titulo"
      onCancel={(e) => {
        e.preventDefault();
        alCerrar();
      }}
    >
      <form onSubmit={guardar} className="flex max-h-[inherit] flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-borde px-5 py-4">
          <h2 id="editor-seccion-titulo" className="seccion-titulo">
            {seccion ? "Editar sección" : "Nueva sección"}
          </h2>
          <button type="button" onClick={alCerrar} aria-label="Cerrar" className="boton-mini -mr-2">
            <span aria-hidden>✕</span>
          </button>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto px-5 py-5">
          <EditorCategoria
            id="seccion"
            placeholder="Ej: Cocina, Pasajes, Comidas"
            nombre={nombre}
            alCambiarNombre={setNombre}
            color={color}
            alCambiarColor={setColor}
            emoji={emoji}
            alCambiarEmoji={setEmoji}
            idError={error ? "error-seccion" : undefined}
            maximoNombre={MAXIMO_NOMBRE_SECCION}
          />
          {color !== colorDelGrupo.toLowerCase() && (
            <button
              type="button"
              onClick={() => setColor(colorDelGrupo.toLowerCase())}
              className="boton-mini -ml-2.5 self-start"
            >
              Usar el color del grupo
            </button>
          )}
          {error && <Aviso id="error-seccion" tono="error">{error}</Aviso>}
        </div>

        <div className="flex justify-end gap-2 border-t border-borde px-5 py-4">
          <button type="button" onClick={alCerrar} className="boton-linea">
            Cancelar
          </button>
          <button type="submit" disabled={ocupado || nombre.trim() === ""} className="boton">
            {ocupado ? "Guardando..." : seccion ? "Guardar cambios" : "Agregar"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
