"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Aviso, useAvisoTemporal, enfocarCampoConError } from "@/components/Aviso";
import { EditorMeta } from "@/components/EditorMeta";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "@/lib/format";
import { repartirEnPartesIguales } from "@/lib/saldos";

type Persona = { id: string; nombre: string };
export type Aporte = { id: string; userId: string; monto: number; fecha: string; registradoPorId: string };

/**
 * La meta de ahorro del grupo: cuánto quieren juntar entre todos (por
 * ejemplo, para un viaje), cuánto llevan y cuánto falta, en pesos o en
 * dólares (todo en la moneda de la meta y con su color). Debajo, la parte de
 * cada uno: la meta dividida en partes iguales, con lo que puso cada uno.
 *
 * Los aportes no son gastos: no suman en el mes de nadie ni cambian quién le
 * debe a quién. Cualquiera anota un aporte, propio o de otro; lo borra quien
 * lo anotó o el administrador.
 */
export function MetaGrupo({
  grupoId,
  yo,
  esAdmin,
  archivado,
  personas,
  meta,
  moneda,
  aportes,
}: {
  grupoId: string;
  yo: string;
  esAdmin: boolean;
  archivado: boolean;
  personas: Persona[];
  meta: number;
  /** La moneda de la meta: todo se muestra en ella, con su color. */
  moneda: "UYU" | "USD";
  aportes: Aporte[];
}) {
  const router = useRouter();
  const [aviso, mostrarAviso] = useAvisoTemporal();
  const [anotando, setAnotando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [verAportes, setVerAportes] = useState(false);
  const [monto, setMonto] = useState("");
  const [quien, setQuien] = useState(yo);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const compartido = personas.length > 1;
  const colorMoneda = moneda === "UYU" ? "var(--peso)" : "var(--dolar)";
  const simbolo = moneda === "UYU" ? "$" : "US$";
  const nombre = (id: string) => (id === yo ? "Vos" : (personas.find((p) => p.id === id)?.nombre ?? "Alguien"));

  const juntado = aportes.reduce((t, a) => t + a.monto, 0);
  const falta = Math.max(0, meta - juntado);
  const progreso = Math.min(100, (juntado / meta) * 100);
  const cumplida = juntado >= meta - 0.005;

  // La parte de cada uno: la meta en partes iguales (los centavos que no se
  // dividen parejo van al primero, el administrador).
  const partes = repartirEnPartesIguales(meta, personas.map((p) => p.id), personas[0]?.id ?? yo);
  const puso = new Map<string, number>();
  for (const a of aportes) puso.set(a.userId, (puso.get(a.userId) ?? 0) + a.monto);

  async function pedir(url: string, metodo: string, cuerpo?: unknown) {
    const res = await fetch(url, {
      method: metodo,
      headers: cuerpo ? { "Content-Type": "application/json" } : undefined,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    const datos = await res.json().catch(() => ({}));
    return { ok: res.ok, error: (datos.error as string | undefined) ?? null };
  }

  async function anotar(e: React.FormEvent) {
    e.preventDefault();
    if (ocupado) return;
    setError(null);
    const numero = parseMoneyInput(monto);
    if (!Number.isFinite(numero) || numero <= 0) {
      setError("Escribí un monto mayor que cero.");
      enfocarCampoConError("monto-aporte");
      return;
    }
    setOcupado(true);
    try {
      const res = await pedir(`/api/grupos/${grupoId}/aportes`, "POST", { monto: numero, userId: quien });
      if (!res.ok) {
        setError(res.error ?? "No se pudo anotar el aporte.");
        return;
      }
      mostrarAviso(
        quien === yo
          ? `Aporte de ${formatMoney(numero, moneda)} anotado.`
          : `Aporte de ${nombre(quien)} por ${formatMoney(numero, moneda)} anotado.`
      );
      setMonto("");
      setAnotando(false);
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  async function borrar(aporte: Aporte) {
    if (ocupado) return;
    setOcupado(true);
    try {
      const res = await pedir(`/api/grupos/${grupoId}/aportes/${aporte.id}`, "DELETE");
      if (res.ok) mostrarAviso("Aporte borrado.");
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section aria-labelledby="titulo-meta" className="tarjeta aparece flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="titulo-meta" className="text-sm font-medium text-suave">
            Meta del grupo
          </h2>
          <p className="mt-1 text-sm text-suave">
            <span className={`monto text-xl font-semibold ${cumplida ? "text-texto" : moneda === "UYU" ? "text-peso" : "text-dolar"}`}>
              {formatMoney(juntado, moneda)}
            </span>{" "}
            de <span className="monto text-texto">{formatMoney(meta, moneda)}</span>
          </p>
        </div>
        {esAdmin && !archivado && (
          <button type="button" onClick={() => setEditando(true)} aria-haspopup="dialog" className="boton-mini -mr-2">
            Editar
          </button>
        )}
      </div>

      {/* El progreso de todo el grupo. */}
      <div>
        <span
          role="progressbar"
          aria-label="Lo juntado de la meta"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progreso)}
          className="block h-2.5 overflow-hidden rounded-full bg-borde"
        >
          <span
            className={`block h-full rounded-full transition-[width] duration-500 ${moneda === "UYU" ? "bg-peso" : "bg-dolar"}`}
            style={{ width: `${progreso}%` }}
          />
        </span>
        <p className="mt-1.5 flex justify-between gap-3 text-xs text-tenue">
          <span>{Math.floor(progreso)} %</span>
          <span>{cumplida ? "¡Meta cumplida!" : `Faltan ${formatMoney(falta, moneda)}`}</span>
        </p>
      </div>

      {/* La parte de cada uno. */}
      {compartido && (
        <div className="flex flex-col gap-2.5 border-t border-borde pt-4">
          <p className="text-xs font-medium text-tenue">Parte de cada uno</p>
          <ul className="flex flex-col gap-3">
            {personas.map((p) => {
              const objetivo = partes.get(p.id) ?? 0;
              const lleva = puso.get(p.id) ?? 0;
              const faltaPersona = Math.max(0, objetivo - lleva);
              return (
                <li key={p.id} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className={p.id === yo ? "font-medium text-texto" : "text-suave"}>{nombre(p.id)}</span>
                    <span className="monto text-xs text-tenue">
                      <span className="text-sm text-texto">{formatMoney(lleva, moneda)}</span> de{" "}
                      {formatMoney(objetivo, moneda)}
                    </span>
                  </div>
                  <span aria-hidden className="block h-1.5 overflow-hidden rounded-full bg-borde">
                    <span
                      className={`block h-full rounded-full ${moneda === "UYU" ? "bg-peso" : "bg-dolar"}`}
                      style={{ width: `${objetivo > 0 ? Math.min(100, (lleva / objetivo) * 100) : 0}%`, opacity: p.id === yo ? 1 : 0.6 }}
                    />
                  </span>
                  <span className="text-right text-[11px] text-tenue">
                    {faltaPersona < 0.005 ? "Completó su parte" : `Le faltan ${formatMoney(faltaPersona, moneda)}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Anotar un aporte. */}
      {!archivado &&
        (!anotando ? (
          <div className="flex flex-wrap items-center gap-3 border-t border-borde pt-4">
            <button type="button" onClick={() => setAnotando(true)} className="boton-linea">
              + Anotar aporte
            </button>
            {aviso && <Aviso tono="ok">{aviso}</Aviso>}
          </div>
        ) : (
          <form onSubmit={anotar} className="desplegar flex flex-col gap-3 border-t border-borde pt-4">
            {compartido && (
              <fieldset className="min-w-0">
                <legend className="rotulo mb-2">¿Quién puso?</legend>
                <div className="flex flex-wrap gap-1.5">
                  {personas.map((p) => (
                    <label key={p.id} className="ficha">
                      <input
                        type="radio"
                        name="quien-aporta"
                        checked={quien === p.id}
                        onChange={() => setQuien(p.id)}
                        className="sr-only"
                      />
                      <span
                        style={
                          quien === p.id
                            ? {
                                borderColor: colorMoneda,
                                backgroundColor: `color-mix(in srgb, ${colorMoneda} 14%, transparent)`,
                                color: "var(--texto)",
                              }
                            : undefined
                        }
                      >
                        {nombre(p.id)}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="monto-aporte" className="rotulo">Cuánto</label>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <span aria-hidden className="monto pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-suave">
                    {simbolo}
                  </span>
                  <input
                    id="monto-aporte"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder={formatMoneyInput(String(Math.round(partes.get(quien) ?? 0)))}
                    value={monto}
                    onChange={(e) => setMonto(formatMoneyInput(e.target.value))}
                    aria-describedby={error ? "error-aporte" : undefined}
                    className={`campo monto ${moneda === "UYU" ? "pl-7" : "pl-11"}`}
                  />
                </div>
                <button type="submit" disabled={ocupado} className="boton shrink-0">
                  {ocupado ? "Anotando..." : "Anotar"}
                </button>
              </div>
            </div>
            {error && <Aviso id="error-aporte" tono="error">{error}</Aviso>}
            <button
              type="button"
              onClick={() => {
                setAnotando(false);
                setError(null);
              }}
              className="boton-mini -ml-2.5 self-start"
            >
              Cancelar
            </button>
          </form>
        ))}

      {/* Los aportes anotados, plegados. */}
      {aportes.length > 0 && (
        <div className="border-t border-borde pt-3">
          <button
            type="button"
            onClick={() => setVerAportes((v) => !v)}
            aria-expanded={verAportes}
            className="boton-mini -ml-2.5"
          >
            {verAportes ? "Ocultar aportes" : `Ver aportes (${aportes.length})`}
          </button>
          {verAportes && (
            <ul className="desplegar mt-2 flex flex-col">
              {aportes.map((a) => (
                <li key={a.id} className="flex items-center gap-3 border-borde py-2 not-first:border-t">
                  <span className="monto w-12 shrink-0 text-xs text-tenue">
                    {a.fecha.slice(8, 10)}/{a.fecha.slice(5, 7)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-suave">{nombre(a.userId)}</span>
                  <span className="monto shrink-0 text-sm text-texto">{formatMoney(a.monto, moneda)}</span>
                  {!archivado && (a.registradoPorId === yo || esAdmin) && (
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => borrar(a)}
                      aria-label={`Borrar el aporte de ${nombre(a.userId)}`}
                      className="boton-mini boton-mini-peligro -mr-2 shrink-0"
                    >
                      <span aria-hidden>✕</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {editando && (
        <EditorMeta
          grupoId={grupoId}
          actual={meta}
          monedaActual={moneda}
          hayAportes={aportes.length > 0}
          personas={personas.length}
          alCerrar={() => setEditando(false)}
          alGuardar={(texto) => {
            setEditando(false);
            mostrarAviso(texto);
            router.refresh();
          }}
        />
      )}
    </section>
  );
}
