"use client";

import { useEffect, useState } from "react";
import type { Category } from "@/lib/types";

const COLOR_PRESET = ["#f97316", "#3b82f6", "#8b5cf6", "#06b6d4", "#ec4899", "#22c55e", "#64748b", "#ef4444"];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_PRESET[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/categories");
    setCategories(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo crear la categoría");
      return;
    }
    setName("");
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta categoría? Los gastos asociados no se borran.")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="rotulo">El color identifica cada gasto en las listas</p>
        <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-texto">Categorías</h1>
      </header>

      <form onSubmit={handleCreate} className="tarjeta flex flex-col gap-4 p-4 sm:p-5">
        <p className="rotulo">Nueva categoría</p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="nombre-categoria" className="rotulo">Nombre</label>
          <input
            id="nombre-categoria"
            type="text"
            placeholder="Ej: Alimentación"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="campo"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="rotulo">Color</span>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESET.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded transition-transform hover:scale-105 ${
                  color === c ? "ring-2 ring-texto ring-offset-2 ring-offset-superficie" : ""
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
                aria-pressed={color === c}
              />
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-alerta">{error}</p>}

        <div className="flex items-center justify-between gap-3 border-t border-borde pt-4">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="punto" style={{ backgroundColor: color }} />
            <span className="truncate text-sm text-suave">{name || "Sin nombre"}</span>
          </span>
          <button type="submit" className="boton">
            Agregar
          </button>
        </div>
      </form>

      <section>
        <h2 className="rotulo mb-3">Tus categorías</h2>
        {loading ? (
          <p className="tarjeta px-4 py-6 text-center text-sm text-suave">Cargando...</p>
        ) : categories.length === 0 ? (
          <p className="tarjeta px-4 py-6 text-center text-sm text-suave">
            Todavía no creaste ninguna categoría.
          </p>
        ) : (
          <div className="lista">
            {categories.map((cat) => (
              <div key={cat.id} className="fila">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="punto" style={{ backgroundColor: cat.color }} />
                  <span className="truncate text-sm text-texto">{cat.name}</span>
                </div>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="boton-mini boton-mini-peligro shrink-0"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
