"use client";

import { useEffect, useRef, useState } from "react";
import { Aviso, enfocarCampoConError } from "@/components/Aviso";
import { COLORES_DE_GRUPO, MAXIMO_NOMBRE_GRUPO } from "@/lib/grupos";

/**
 * Cambiar el nombre, la descripción y el color de un grupo ya creado. Solo lo
 * abre el administrador. Los colores son los mismos del asistente de
 * creación; si el grupo tenía uno que ya no está en la paleta, se muestra
 * igual, primero.
 */
export function EditorGrupo({
  grupo,
  alCerrar,
  alGuardar,
}: {
  grupo: { id: string; nombre: string; descripcion: string | null; color: string };
  alCerrar: () => void;
  alGuardar: (aviso: string) => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [nombre, setNombre] = useState(grupo.nombre);
  const [descripcion, setDescripcion] = useState(grupo.descripcion ?? "");
  const [color, setColor] = useState(grupo.color.toLowerCase());
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    dialogo.current?.showModal();
  }, []);

  const colores = COLORES_DE_GRUPO.includes(grupo.color.toLowerCase())
    ? COLORES_DE_GRUPO
    : [grupo.color.toLowerCase(), ...COLORES_DE_GRUPO];

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (ocupado) return;
    setError(null);
    if (nombre.trim() === "") {
      setError("Escribí un nombre para el grupo.");
      enfocarCampoConError("nombre-grupo-editar");
      return;
    }
    setOcupado(true);
    try {
      const res = await fetch(`/api/grupos/${grupo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim(), descripcion: descripcion.trim() || null, color }),
      });
      const datos = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(datos.error ?? "No se pudo guardar el grupo.");
        return;
      }
      alGuardar("Grupo guardado.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <dialog
      ref={dialogo}
      className="dialogo"
      aria-labelledby="editor-grupo-titulo"
      onCancel={(e) => {
        e.preventDefault();
        alCerrar();
      }}
    >
      <form onSubmit={guardar} className="flex flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 id="editor-grupo-titulo" className="seccion-titulo">Nombre y color</h2>
          <button type="button" onClick={alCerrar} aria-label="Cerrar" className="boton-mini -mr-2 -mt-1">
            <span aria-hidden>✕</span>
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="nombre-grupo-editar" className="rotulo">Nombre</label>
          <input
            id="nombre-grupo-editar"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={MAXIMO_NOMBRE_GRUPO}
            aria-describedby={error ? "error-grupo" : undefined}
            className="campo"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="descripcion-grupo-editar" className="rotulo">
            Descripción <span className="font-normal text-tenue">· opcional</span>
          </label>
          <input
            id="descripcion-grupo-editar"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={200}
            placeholder="Ej: Todo lo del viaje de enero"
            className="campo"
          />
        </div>

        <fieldset>
          <legend className="rotulo mb-2">Color</legend>
          <div className="flex flex-wrap gap-2">
            {colores.map((opcion) => (
              <label key={opcion} className="cursor-pointer">
                <input
                  type="radio"
                  name="color-grupo-editar"
                  value={opcion}
                  checked={opcion === color}
                  onChange={() => setColor(opcion)}
                  className="peer sr-only"
                />
                <span
                  className="block h-8 w-8 rounded-full ring-offset-2 ring-offset-superficie transition-shadow peer-checked:ring-2 peer-checked:ring-texto peer-focus-visible:ring-2 peer-focus-visible:ring-foco"
                  style={{ backgroundColor: opcion }}
                />
                <span className="sr-only">Color {opcion}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {error && <Aviso id="error-grupo" tono="error">{error}</Aviso>}

        <div className="flex justify-end gap-2 border-t border-borde pt-4">
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
