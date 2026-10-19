"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Aviso } from "@/components/Aviso";
import { Conmutador } from "@/components/CamposGasto";
import {
  COLORES_DE_GRUPO,
  MAXIMO_NOMBRE_GRUPO,
  MAXIMO_NOMBRE_SECCION,
  MAXIMO_SECCIONES,
  SECCIONES_SUGERIDAS,
  limpiarSecciones,
} from "@/lib/grupos";
import { trazarMosaico } from "@/lib/mosaico";
import estilos from "./PanelGrupo.module.css";

/**
 * Crear un grupo, en una sola pantalla: el nombre, el color y si se divide en
 * secciones (y cuáles).
 *
 * No se pregunta "para qué es": todos los grupos arrancan igual, y lo que haga
 * falta (sumar amigos, una meta) se prende después adentro del grupo. A la
 * derecha (abajo en el celular) se ve el grupo armándose con el mismo mosaico
 * de secciones que va a tener su página, así se entiende qué se está creando.
 */
export function AsistenteGrupo() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [color, setColor] = useState(COLORES_DE_GRUPO[0]);
  const [conSecciones, setConSecciones] = useState(true);
  const [secciones, setSecciones] = useState<string[]>([]);
  const [nueva, setNueva] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const sugeridas = SECCIONES_SUGERIDAS.filter(
    (s) => !secciones.some((elegida) => elegida.toLowerCase() === s.toLowerCase())
  );
  const llenas = secciones.length >= MAXIMO_SECCIONES;

  function agregarSeccion(texto: string) {
    setSecciones((previas) => limpiarSecciones([...previas, texto]));
    setNueva("");
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (guardando) return;
    setError(null);

    if (nombre.trim() === "") {
      setError("Ponele un nombre al grupo.");
      document.getElementById("nombre-grupo")?.focus();
      return;
    }

    setGuardando(true);
    try {
      // Lo que quedó escrito sin agregar también cuenta: es fácil olvidarse
      // de apretar "Agregar" en la última.
      const seccionesFinales = conSecciones ? limpiarSecciones([...secciones, nueva]) : [];
      const res = await fetch("/api/grupos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          color,
          descripcion: descripcion || undefined,
          // "Con secciones" sin ninguna escrita es un grupo sin secciones: si
          // no, el primer gasto aparecía en el mosaico como una pieza
          // "Sin sección" que parecía una sección más.
          usaSecciones: seccionesFinales.length > 0,
          secciones: seccionesFinales,
        }),
      });
      const datos = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(datos.error ?? "No se pudo crear el grupo.");
        return;
      }
      router.push(`/grupos/${datos.id}`);
      router.refresh();
    } finally {
      setGuardando(false);
    }
  }

  // Todas las secciones miden lo mismo: todavía no hay gastos que las pesen.
  const piezas = trazarMosaico(
    secciones.map((s) => ({ dato: s, peso: 1 })),
    1.6
  );

  return (
    <div
      className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
      style={{ "--grupo": color } as React.CSSProperties}
    >
      <form onSubmit={crear} className="tarjeta flex flex-col gap-6 p-4 sm:p-6">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nombre-grupo" className="rotulo">Nombre</label>
          <input
            id="nombre-grupo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Obra de la casa"
            maxLength={MAXIMO_NOMBRE_GRUPO}
            autoFocus
            className="campo text-base"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="descripcion-grupo" className="rotulo">
            Descripción <span className="normal-case tracking-normal">(opcional)</span>
          </label>
          <input
            id="descripcion-grupo"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: Todo lo de la reforma de 2026"
            maxLength={200}
            className="campo"
          />
        </div>

        <fieldset>
          <legend className="rotulo mb-2">Color</legend>
          <div className="flex flex-wrap gap-2">
            {COLORES_DE_GRUPO.map((opcion) => (
              <label key={opcion} className="cursor-pointer">
                <input
                  type="radio"
                  name="color-grupo"
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

        <div className="flex flex-col gap-3 border-t border-borde pt-5">
          {/* Primero la elección y después qué significa: la explicación
              cambia según el botón, así que va debajo de los dos. */}
          <div className="flex flex-col gap-2.5">
            <p className="rotulo">Secciones</p>
            <div className="flex">
              <Conmutador<"si" | "no">
                nombreGrupo="usa-secciones"
                etiqueta="¿Se divide en secciones?"
                opciones={[
                  { valor: "si", texto: "Con secciones" },
                  { valor: "no", texto: "Sin secciones" },
                ]}
                valor={conSecciones ? "si" : "no"}
                alCambiar={(v) => setConSecciones(v === "si")}
              />
            </div>
            <p className="text-sm text-suave">
              {conSecciones
                ? "Las partes en que se divide: los ambientes de la casa, las etapas del viaje. Podés dejarlas para después."
                : "Todos los gastos van juntos, en una sola lista. Si más adelante hacen falta, las prendés adentro del grupo."}
            </p>
          </div>

          {conSecciones && secciones.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {secciones.map((seccion) => (
                <li
                  key={seccion}
                  className="flex items-center gap-1 rounded-full border border-borde py-1 pr-1 pl-3 text-sm text-texto"
                >
                  {seccion}
                  <button
                    type="button"
                    onClick={() => setSecciones((previas) => previas.filter((s) => s !== seccion))}
                    aria-label={`Quitar ${seccion}`}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-suave transition-colors hover:bg-superficie-alta hover:text-texto"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          {conSecciones && (
          <div className="flex gap-2">
            <input
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              onKeyDown={(e) => {
                // Enter agrega la sección en vez de mandar el formulario.
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (nueva.trim()) agregarSeccion(nueva);
                }
              }}
              placeholder="Nombre de la sección"
              aria-label="Nombre de la sección"
              maxLength={MAXIMO_NOMBRE_SECCION}
              disabled={llenas}
              className="campo min-w-0 flex-1"
            />
            <button
              type="button"
              onClick={() => agregarSeccion(nueva)}
              disabled={nueva.trim() === "" || llenas}
              className="boton-linea shrink-0 disabled:opacity-45"
            >
              Agregar
            </button>
          </div>
          )}

          {conSecciones && sugeridas.length > 0 && !llenas && (
            <div className="flex flex-wrap gap-1.5">
              {sugeridas.map((sugerida) => (
                <button
                  key={sugerida}
                  type="button"
                  onClick={() => agregarSeccion(sugerida)}
                  className="rounded-full border border-dashed border-borde-fuerte px-3 py-1 text-sm text-suave transition-colors hover:border-solid hover:text-texto"
                >
                  + {sugerida}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <Aviso tono="error">{error}</Aviso>}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borde pt-5">
          <p className="text-xs text-tenue">
            Después, adentro del grupo, vas a poder sumar a tus amigos.
          </p>
          <div className="flex gap-2">
            <Link href="/grupos" className="boton-linea">
              Cancelar
            </Link>
            <button type="submit" disabled={guardando} className="boton">
              {guardando ? "Creando..." : "Crear grupo"}
            </button>
          </div>
        </div>
      </form>

      {/* La vista previa: el grupo como va a quedar. */}
      <aside aria-label="Vista previa" className="lg:sticky lg:top-20">
        <p className="rotulo mb-3">Así va a quedar</p>
        <div className="tarjeta relative overflow-hidden p-4">
          <span aria-hidden className="filete" style={{ backgroundColor: color }} />
          <p className="truncate text-base font-semibold tracking-tight text-texto">
            {nombre.trim() || "Nombre del grupo"}
          </p>
          <p className="mt-0.5 truncate text-xs text-tenue">
            {descripcion.trim() ||
              (conSecciones
                ? `${secciones.length} ${secciones.length === 1 ? "sección" : "secciones"}`
                : "Sin secciones")}
          </p>

          <div className="mt-4">
            {!conSecciones ? (
              // Sin secciones, la página del grupo es una sola lista de gastos.
              <div className="flex flex-col gap-2" aria-hidden>
                {[0.9, 0.7, 0.8].map((largo, i) => (
                  <div key={i} className="flex items-center gap-3 border-b border-borde pb-2 last:border-0">
                    <span className="h-2 w-6 rounded-full bg-borde" />
                    <span className="h-2 rounded-full bg-borde" style={{ width: `${largo * 50}%` }} />
                    <span className="ml-auto h-2 w-12 rounded-full bg-borde-fuerte" />
                  </div>
                ))}
                <p className="mt-1 text-center text-xs text-tenue">Una sola lista de gastos.</p>
              </div>
            ) : piezas.length === 0 ? (
              <div className="flex aspect-[1.6] items-center justify-center rounded-[10px] border border-dashed border-borde-fuerte px-4 text-center text-xs text-tenue">
                Las secciones que agregues aparecen acá.
              </div>
            ) : (
              <div className="-m-[3px]">
                <div className={estilos.mosaico} style={{ aspectRatio: "1.6" }}>
                  {piezas.map(({ dato, x, y, ancho, alto }) => (
                    <div
                      key={dato}
                      className={`${estilos.seccion} ${ancho * 1.6 < 34 || alto < 38 ? estilos.chica : ""}`}
                      style={
                        {
                          left: `${x}%`,
                          top: `${y}%`,
                          width: `${ancho}%`,
                          height: `${alto}%`,
                          "--peso": 0.3,
                        } as React.CSSProperties
                      }
                    >
                      <div className={estilos.seccionCaja}>
                        <span className={estilos.seccionNombre}>{dato}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
