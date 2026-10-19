"use client";

import { Insignia } from "@/components/Insignia";
import { useEffect, useState } from "react";
import type { Category } from "@/lib/types";
import { Vacio, IconoEtiqueta } from "@/components/Vacio";
import { EditorCategoria } from "@/components/EditorCategoria";
import { Aviso, useAvisoTemporal, enfocarCampoConError } from "@/components/Aviso";
import { EsqueletoLista } from "@/components/Esqueleto";
import { Confirmar } from "@/components/Confirmar";

/** Con qué color arranca el formulario. Tiene que ser un #rrggbb válido: la API
 *  rechaza cualquier otra cosa. */
const COLOR_INICIAL = "#3b82f6";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_INICIAL);
  const [emoji, setEmoji] = useState<string | null>(null);
  /** La categoría que se está editando en el formulario; null si se crea una nueva. */
  const [editando, setEditando] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [avisoGuardado, mostrarAvisoGuardado] = useAvisoTemporal();
  // La categoría que el diálogo está por eliminar.
  const [porEliminar, setPorEliminar] = useState<Category | null>(null);

  async function load() {
    const res = await fetch("/api/categories");
    setCategories(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, []);

  function limpiar() {
    setEditando(null);
    setName("");
    setColor(COLOR_INICIAL);
    setEmoji(null);
    setError(null);
  }

  /** Lleva una categoría al formulario de arriba para cambiarla. */
  function empezarEdicion(cat: Category) {
    setEditando(cat);
    setName(cat.name);
    setColor(cat.color.toLowerCase());
    setEmoji(cat.emoji ?? null);
    setError(null);
    document.getElementById("formulario-categoria")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (guardando) return;

    setError(null);
    setGuardando(true);
    try {
      const res = await fetch(editando ? `/api/categories/${editando.id}` : "/api/categories", {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color, emoji }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? (editando ? "No se pudo guardar la categoría" : "No se pudo crear la categoría"));
        enfocarCampoConError("categoria-nombre");
        return;
      }

      mostrarAvisoGuardado(editando ? `Categoría "${name.trim()}" guardada.` : `Categoría "${name.trim()}" creada.`);
      limpiar();
      await load();
    } finally {
      setGuardando(false);
    }
  }

  async function handleDelete(cat: Category) {
    setPorEliminar(null);
    if (editando?.id === cat.id) limpiar();
    await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
    mostrarAvisoGuardado(`Categoría "${cat.name}" eliminada.`);
    load();
  }

  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="rotulo">El color y el emoji identifican cada gasto en las listas</p>
        <h1 className="titulo">Categorías</h1>
      </header>

      <form
        id="formulario-categoria"
        onSubmit={handleSubmit}
        className="tarjeta flex scroll-mt-20 flex-col gap-5 p-4 sm:p-5"
      >
        <p className="seccion-titulo">{editando ? `Editar «${editando.name}»` : "Nueva categoría"}</p>

        <EditorCategoria
          id="categoria"
          placeholder="Ej: Alimentación"
          nombre={name}
          alCambiarNombre={setName}
          color={color}
          alCambiarColor={setColor}
          emoji={emoji}
          alCambiarEmoji={setEmoji}
          idError={error ? "error-categoria" : undefined}
          maximoNombre={50}
        />

        {error && <Aviso id="error-categoria" tono="error">{error}</Aviso>}
        {avisoGuardado && <Aviso tono="ok">{avisoGuardado}</Aviso>}

        <div className="flex items-center justify-end gap-2 border-t border-borde pt-4">
          {editando && (
            <button type="button" onClick={limpiar} className="boton-linea">
              Cancelar
            </button>
          )}
          <button type="submit" disabled={guardando} className="boton">
            {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Agregar"}
          </button>
        </div>
      </form>

      <section>
        <h2 className="seccion-titulo mb-3 px-1">Tus categorías</h2>
        {loading ? (
          <EsqueletoLista dosLineas={false} />
        ) : categories.length === 0 ? (
          <Vacio
            icono={<IconoEtiqueta />}
            titulo="Sin categorías propias"
            detalle="Creá la primera con el formulario de arriba. El color y el emoji que le pongas son los que van a identificar sus gastos en todas las listas."
          />
        ) : (
          <div className="lista">
            {categories.map((cat) => (
              <div key={cat.id} className={`fila ${editando?.id === cat.id ? "bg-superficie-alta" : ""}`}>
                <div className="flex min-w-0 items-center gap-3">
                  <Insignia nombre={cat.name} color={cat.color} emoji={cat.emoji} />
                  <span className="truncate text-[15px] font-medium text-texto">{cat.name}</span>
                </div>
                <span className="flex shrink-0 items-center gap-1">
                  <button onClick={() => empezarEdicion(cat)} className="boton-mini">
                    Editar
                  </button>
                  <button onClick={() => setPorEliminar(cat)} className="boton-mini boton-mini-peligro">
                    Eliminar
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <Confirmar
        abierto={porEliminar !== null}
        titulo="¿Eliminar esta categoría?"
        detalle={
          porEliminar
            ? `Los gastos cargados en "${porEliminar.name}" no se borran, pero se quedan sin categoría.`
            : ""
        }
        textoConfirmar="Eliminar"
        alConfirmar={() => porEliminar && handleDelete(porEliminar)}
        alCancelar={() => setPorEliminar(null)}
      />
    </div>
  );
}
