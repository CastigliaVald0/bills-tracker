"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Confirmar } from "@/components/Confirmar";
import { EditorGrupo } from "@/components/EditorGrupo";
import { EditorMeta } from "@/components/EditorMeta";
import { formatMoney } from "@/lib/format";

type Grupo = {
  id: string;
  nombre: string;
  descripcion: string | null;
  color: string;
  archivado: boolean;
  usaSecciones: boolean;
};

const ICONO = "h-[18px] w-[18px]";
const trazo = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/**
 * Los ajustes del grupo, guardados en una tuerca al final de la pestaña Grupo
 * (solo para el administrador). Al tocarla, la tuerca gira y las opciones se
 * despliegan ahí mismo, hacia abajo, apareciendo de a una, como los ajustes
 * del celular: ícono, nombre, el valor de hoy y una flecha. Al tocarla de
 * nuevo se pliegan.
 */
export function AjustesGrupo({
  grupo,
  metaMonto,
  metaMoneda,
  hayAportes,
  personas,
  cantidadGastos,
}: {
  grupo: Grupo;
  metaMonto: number | null;
  metaMoneda: "UYU" | "USD";
  hayAportes: boolean;
  /** Cuántos integrantes hay, para el editor de la meta. */
  personas: number;
  /** Cuántos gastos tiene, para avisar qué pasa al borrar. */
  cantidadGastos: number;
}) {
  const router = useRouter();
  /** Si las opciones están desplegadas. */
  const [abierto, setAbierto] = useState(false);
  const [editor, setEditor] = useState<"grupo" | "meta" | null>(null);
  const [confirmar, setConfirmar] = useState<"archivar" | "secciones" | "borrar" | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function cambiar(cuerpo: unknown) {
    if (ocupado) return false;
    setOcupado(true);
    try {
      const res = await fetch(`/api/grupos/${grupo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      router.refresh();
      return res.ok;
    } finally {
      setOcupado(false);
    }
  }

  async function borrar() {
    if (ocupado) return;
    setOcupado(true);
    try {
      const res = await fetch(`/api/grupos/${grupo.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/grupos");
        router.refresh();
      }
    } finally {
      setOcupado(false);
    }
  }

  // Las filas, en orden: lo del grupo en sí y, aparte, lo de cuando termina.
  // `i` escalona su entrada.
  let i = 0;
  function fila({
    icono,
    titulo,
    valor,
    alTocar,
    peligro = false,
  }: {
    icono: React.ReactNode;
    titulo: string;
    valor?: React.ReactNode;
    alTocar: () => void;
    peligro?: boolean;
  }) {
    const orden = i++;
    return (
      <li style={{ "--i": orden } as React.CSSProperties}>
        <button
          type="button"
          onClick={alTocar}
          disabled={ocupado}
          className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-superficie-alta disabled:opacity-50 ${
            peligro ? "text-alerta" : "text-texto"
          }`}
        >
          <span
            aria-hidden
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              peligro ? "bg-alerta-fondo text-alerta" : "bg-superficie-alta text-suave"
            }`}
          >
            {icono}
          </span>
          <span className="min-w-0 flex-1 text-sm font-medium">{titulo}</span>
          {valor && <span className="max-w-[45%] shrink-0 truncate text-xs text-tenue">{valor}</span>}
          <span aria-hidden className="-mr-0.5 shrink-0 text-base leading-none text-tenue">
            ›
          </span>
        </button>
      </li>
    );
  }

  const textoBorrar = `No se puede deshacer. Se borran el grupo y sus secciones.${
    cantidadGastos === 1
      ? " Su gasto queda como un gasto común en el mes donde estaba."
      : cantidadGastos > 1
        ? ` Sus ${cantidadGastos} gastos quedan como gastos comunes en los meses donde estaban.`
        : ""
  }`;

  return (
    <>
      <section aria-label="Ajustes del grupo" className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-controls="panel-ajustes"
          className="tuerca tarjeta flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-superficie-alta"
        >
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-superficie-alta text-suave"
          >
            <svg {...trazo} className="h-5 w-5">
              <path d="M10.3 3.6a1.7 1.7 0 0 1 3.4 0 1.7 1.7 0 0 0 2.6 1.1 1.7 1.7 0 0 1 2.4 2.4 1.7 1.7 0 0 0 1.1 2.6 1.7 1.7 0 0 1 0 3.4 1.7 1.7 0 0 0-1.1 2.6 1.7 1.7 0 0 1-2.4 2.4 1.7 1.7 0 0 0-2.6 1.1 1.7 1.7 0 0 1-3.4 0 1.7 1.7 0 0 0-2.6-1.1 1.7 1.7 0 0 1-2.4-2.4 1.7 1.7 0 0 0-1.1-2.6 1.7 1.7 0 0 1 0-3.4 1.7 1.7 0 0 0 1.1-2.6 1.7 1.7 0 0 1 2.4-2.4 1.7 1.7 0 0 0 2.6-1.1z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </span>
          <span className="min-w-0 flex-1 text-[15px] font-medium text-texto">Ajustes del grupo</span>
          <span aria-hidden className="tuerca-flecha shrink-0 text-lg leading-none text-tenue">
            ›
          </span>
        </button>

        {abierto && (
          <div id="panel-ajustes" className="ajustes-panel tarjeta overflow-hidden">
        <div className="flex flex-col gap-2 p-2">
              {!grupo.archivado && (
                <div>
                  <p className="px-3 pt-1.5 pb-1 text-xs font-medium text-tenue">El grupo</p>
                  <ul className="flex flex-col">
                    {fila({
                      icono: <span className="block h-3 w-3 rounded-full" style={{ backgroundColor: grupo.color }} />,
                      titulo: "Nombre y color",
                      valor: grupo.nombre,
                      alTocar: () => setEditor("grupo"),
                    })}
                    {fila({
                      icono: <span className="text-sm leading-none">🎯</span>,
                      titulo: "Meta de ahorro",
                      valor: metaMonto === null ? "Sin meta" : formatMoney(metaMonto, metaMoneda),
                      alTocar: () => setEditor("meta"),
                    })}
                    {!grupo.usaSecciones &&
                      fila({
                        icono: (
                          <svg {...trazo} className={ICONO}>
                            <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
                            <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
                            <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
                            <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
                          </svg>
                        ),
                        titulo: "Dividir en secciones",
                        valor: "Sin secciones",
                        alTocar: () => setConfirmar("secciones"),
                      })}
                  </ul>
                </div>
              )}

              <div className={grupo.archivado ? "" : "border-t border-borde pt-1"}>
                <p className="px-3 pt-1.5 pb-1 text-xs font-medium text-tenue">Cuando termine</p>
                <ul className="flex flex-col">
                  {fila({
                    icono: (
                      <svg {...trazo} className={ICONO}>
                        <rect x="3.5" y="4.5" width="17" height="4.5" rx="1" />
                        <path d="M5 9v9.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V9M10 13h4" />
                      </svg>
                    ),
                    titulo: grupo.archivado ? "Reabrir el grupo" : "Archivar el grupo",
                    valor: grupo.archivado ? "Archivado" : undefined,
                    // Reabrir no tiene riesgo; archivar se confirma.
                    alTocar: () => (grupo.archivado ? cambiar({ archivado: false }) : setConfirmar("archivar")),
                  })}
                  {fila({
                    icono: (
                      <svg {...trazo} className={ICONO}>
                        <path d="M4.5 7h15M9.5 7V5h5v2M6.5 7l1 12.5h9l1-12.5M10 11v5.5M14 11v5.5" />
                      </svg>
                    ),
                    titulo: "Borrar el grupo",
                    alTocar: () => setConfirmar("borrar"),
                    peligro: true,
                  })}
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>

      {editor === "grupo" && (
        <EditorGrupo
          grupo={grupo}
          alCerrar={() => setEditor(null)}
          alGuardar={() => {
            setEditor(null);
            router.refresh();
          }}
        />
      )}
      {editor === "meta" && (
        <EditorMeta
          grupoId={grupo.id}
          actual={metaMonto}
          monedaActual={metaMoneda}
          hayAportes={hayAportes}
          personas={personas}
          alCerrar={() => setEditor(null)}
          alGuardar={() => {
            setEditor(null);
            router.refresh();
          }}
        />
      )}

      <Confirmar
        abierto={confirmar !== null}
        titulo={
          confirmar === "archivar"
            ? `¿Archivar ${grupo.nombre}?`
            : confirmar === "secciones"
              ? "¿Dividir el grupo en secciones?"
              : `¿Borrar ${grupo.nombre}?`
        }
        detalle={
          confirmar === "archivar"
            ? "Para cuando ya terminó: no admite gastos nuevos, pero queda guardado para consultarlo y se puede reabrir."
            : confirmar === "secciones"
              ? "Vas a poder ver cuánto se fue en cada parte. Los gastos de hoy quedan sin sección, y después no se puede volver a una sola lista."
              : textoBorrar
        }
        textoConfirmar={confirmar === "archivar" ? "Archivar" : confirmar === "secciones" ? "Dividir" : "Borrar"}
        alConfirmar={() => {
          const que = confirmar;
          setConfirmar(null);
          if (que === "archivar") cambiar({ archivado: true });
          else if (que === "secciones") cambiar({ usaSecciones: true });
          else if (que === "borrar") borrar();
        }}
        alCancelar={() => setConfirmar(null)}
      />
    </>
  );
}
