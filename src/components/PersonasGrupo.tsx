"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Aviso } from "@/components/Aviso";
import { Confirmar } from "@/components/Confirmar";

type Persona = { id: string; nombre: string };

/**
 * Quiénes están en el grupo. El administrador suma amigos (que entran recién
 * cuando aceptan) y puede sacar a alguien; cada miembro se puede ir. Nadie se
 * va con plata pendiente: eso lo controla la API y acá se muestra el motivo.
 */
export function PersonasGrupo({
  grupoId,
  yo,
  esAdmin,
  archivado,
  administrador,
  miembros,
  invitados,
  amigosParaSumar,
}: {
  grupoId: string;
  yo: string;
  esAdmin: boolean;
  archivado: boolean;
  administrador: Persona;
  miembros: Persona[];
  invitados: Persona[];
  amigosParaSumar: Persona[];
}) {
  const router = useRouter();
  const [sumando, setSumando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [porSacar, setPorSacar] = useState<Persona | null>(null);

  async function pedir(url: string, metodo: string, cuerpo?: unknown) {
    if (ocupado) return false;
    setError(null);
    setOcupado(true);
    try {
      const res = await fetch(url, {
        method: metodo,
        headers: cuerpo ? { "Content-Type": "application/json" } : undefined,
        body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      });
      const datos = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(datos.error ?? "No se pudo completar la acción.");
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setOcupado(false);
    }
  }

  const nombre = (p: Persona) => (p.id === yo ? `${p.nombre} (vos)` : p.nombre);
  const todos = [administrador, ...miembros];

  return (
    <section aria-labelledby="titulo-personas">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titulo-personas" className="seccion-titulo">
          Personas <span className="text-suave">· {todos.length}</span>
        </h2>
        {esAdmin && !archivado && (
          <button
            type="button"
            onClick={() => setSumando((v) => !v)}
            aria-expanded={sumando}
            className="boton-mini -mr-2"
          >
            {sumando ? "Listo" : "+ Sumar"}
          </button>
        )}
      </div>

      {/* Una persona por fila: en la columna angosta las pastillas en línea
          se partían en renglones desparejos. */}
      <ul className="lista">
        {todos.map((p) => (
          <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm text-texto">
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-superficie-alta text-xs font-semibold text-suave"
            >
              {p.nombre.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate">{nombre(p)}</span>
            {p.id === administrador.id && <span className="text-xs text-tenue">Admin</span>}
            {((esAdmin && p.id !== administrador.id) || (!esAdmin && p.id === yo)) && !archivado && (
              <button
                type="button"
                onClick={() => setPorSacar(p)}
                aria-label={p.id === yo ? "Salir del grupo" : `Sacar a ${p.nombre} del grupo`}
                className="flex h-6 w-6 items-center justify-center rounded-full text-tenue transition-colors hover:bg-superficie-alta hover:text-alerta"
              >
                ✕
              </button>
            )}
          </li>
        ))}
        {invitados.map((p) => (
          <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm text-suave">
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-borde-fuerte text-xs font-semibold text-tenue"
            >
              {p.nombre.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate">{p.nombre}</span>
            <span className="text-xs text-tenue">Invitado</span>
            {esAdmin && (
              <button
                type="button"
                onClick={() => pedir(`/api/grupos/${grupoId}/miembros/${p.id}`, "DELETE")}
                aria-label={`Cancelar la invitación de ${p.nombre}`}
                className="flex h-6 w-6 items-center justify-center rounded-full text-tenue transition-colors hover:bg-superficie-alta hover:text-texto"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>

      {sumando && (
        <div className="desplegar tarjeta mt-3 p-3">
          {amigosParaSumar.length === 0 ? (
            <p className="text-sm text-suave">
              No te quedan amigos para sumar. Los agregás desde la sección Amigos.
            </p>
          ) : (
            <>
              <p className="mb-2 text-xs text-tenue">
                Les llega una invitación y entran cuando la aceptan.
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {amigosParaSumar.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => pedir(`/api/grupos/${grupoId}/miembros`, "POST", { userId: p.id })}
                      className="rounded-full border border-dashed border-borde-fuerte px-3 py-1 text-sm text-suave transition-colors hover:border-solid hover:text-texto"
                    >
                      + {p.nombre}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="mt-2">
          <Aviso tono="error">{error}</Aviso>
        </div>
      )}

      <Confirmar
        abierto={porSacar !== null}
        titulo={porSacar?.id === yo ? "¿Salir del grupo?" : `¿Sacar a ${porSacar?.nombre} del grupo?`}
        detalle={
          porSacar?.id === yo
            ? "Dejás de verlo y de poder cargarle gastos. Tus partes de los gastos que ya se cargaron siguen en tus meses."
            : "Deja de verlo y de poder cargarle gastos. Sus partes de los gastos que ya se cargaron siguen en sus meses."
        }
        textoConfirmar={porSacar?.id === yo ? "Salir" : "Sacar"}
        alConfirmar={async () => {
          const persona = porSacar;
          setPorSacar(null);
          if (!persona) return;
          const ok = await pedir(`/api/grupos/${grupoId}/miembros/${persona.id}`, "DELETE");
          if (ok && persona.id === yo) router.push("/expenses?ver=grupales");
        }}
        alCancelar={() => setPorSacar(null)}
      />
    </section>
  );
}
