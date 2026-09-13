"use client";

import { useEffect, useState } from "react";
import type { Category } from "@/lib/types";

/** Con qué color arranca el formulario. Tiene que ser un #rrggbb válido: la API
 *  rechaza cualquier otra cosa y el selector nativo no acepta un valor vacío. */
const COLOR_INICIAL = "#3b82f6";

const HEX_VALIDO = /^#[0-9a-f]{6}$/;

/** Luminancia relativa WCAG de un color #rrggbb. */
function luminancia(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string) {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

/**
 * Con colores libres existe el riesgo de elegir uno que se confunda con el
 * fondo. El color vive en puntos y barras finas, así que se
 * avisa cuando no llega a 1,5:1 contra la superficie clara o la oscura.
 */
function avisoDeContraste(hex: string) {
  if (contraste(hex, "#fafbf8") < 1.5) return "Muy claro: en tema claro casi no se va a ver.";
  if (contraste(hex, "#16222a") < 1.5) return "Muy oscuro: en tema oscuro casi no se va a ver.";
  return null;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_INICIAL);
  // Lo que el usuario va escribiendo en el campo hex, aunque todavía no sea
  // un color completo. El color real solo cambia cuando el texto es válido.
  const [hexTexto, setHexTexto] = useState(COLOR_INICIAL);
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
    elegirColor(COLOR_INICIAL);
    load();
  }

  function elegirColor(nuevo: string) {
    const normalizado = nuevo.toLowerCase();
    setColor(normalizado);
    setHexTexto(normalizado);
  }

  function escribirHex(texto: string) {
    const conNumeral = (texto.startsWith("#") ? texto : `#${texto}`).toLowerCase().slice(0, 7);
    setHexTexto(conNumeral);
    if (HEX_VALIDO.test(conNumeral)) setColor(conNumeral);
  }

  const aviso = avisoDeContraste(color);

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
          <div className="flex flex-wrap items-center gap-3">
            {/* El input nativo va invisible encima de la muestra: tocarla abre
                la paleta del sistema, también en el celular. */}
            <label
              className="relative h-10 w-14 shrink-0 cursor-pointer overflow-hidden rounded border border-borde transition-transform hover:scale-105"
              style={{ backgroundColor: color }}
              title="Elegir color"
            >
              <input
                type="color"
                value={color}
                onChange={(e) => elegirColor(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Elegir color"
              />
            </label>

            <input
              type="text"
              value={hexTexto}
              onChange={(e) => escribirHex(e.target.value)}
              onBlur={() => setHexTexto(color)}
              maxLength={7}
              spellCheck={false}
              aria-label="Código hexadecimal del color"
              className={`campo monto w-24 uppercase ${
                HEX_VALIDO.test(hexTexto) ? "" : "border-alerta"
              }`}
            />
          </div>
          <p className="text-xs text-tenue">
            {aviso ?? "Tocá el cuadro para abrir la paleta, o escribí el código."}
          </p>
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
