"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Category } from "@/lib/types";
import { CampoMonto, CampoCategoria } from "@/components/CamposGasto";
import { Aviso, useAvisoTemporal, enfocarCampoConError } from "@/components/Aviso";
import { Confirmar } from "@/components/Confirmar";
import { formatMoney, parseMoneyInput } from "@/lib/format";
import { MAXIMO_NOMBRE_SECCION } from "@/lib/grupos";
import { trazarMosaico } from "@/lib/mosaico";
import estilos from "./PanelGrupo.module.css";

type Seccion = { id: string; nombre: string };
type GastoDeGrupo = {
  id: string;
  monto: number;
  moneda: "UYU" | "USD";
  fecha: string;
  descripcion: string | null;
  categoria: string;
  seccionId: string | null;
  /** El monto llevado a pesos. Solo dimensiona el mosaico; nunca se muestra. */
  enPesos: number;
};

/** Cómo se nombra, en el filtro, lo que no tiene sección. */
const SIN_SECCION = "__sin__";

type Resumen = {
  id: string;
  nombre: string;
  UYU: number;
  USD: number;
  cantidad: number;
  enPesos: number;
};

function hoyIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * La página de un grupo: sus secciones, el formulario para cargar un gasto y
 * los movimientos.
 *
 * Las secciones mandan. Se muestran como un mosaico donde cada una ocupa lo
 * que se gastó en ella, y tocar una la elige: eso filtra los movimientos y
 * deja esa sección puesta para el próximo gasto.
 *
 * Los datos los trae la página (servidor); acá solo se muta y se le pide que
 * vuelva a traerlos con router.refresh().
 */
export function PanelGrupo({
  grupo,
  secciones,
  categorias,
  gastos,
}: {
  grupo: { id: string; nombre: string; color: string; archivado: boolean; usaSecciones: boolean };
  secciones: Seccion[];
  categorias: Category[];
  gastos: GastoDeGrupo[];
}) {
  const router = useRouter();
  const [aviso, mostrarAviso] = useAvisoTemporal();
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  /** La sección elegida en el mosaico. Null = todo el grupo. */
  const [elegido, setElegido] = useState<string | null>(null);
  const [anotando, setAnotando] = useState(false);

  const [monto, setMonto] = useState("");
  const [moneda, setMoneda] = useState<"UYU" | "USD">("UYU");
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id ?? "");
  const [fecha, setFecha] = useState(hoyIso());
  const [descripcion, setDescripcion] = useState("");

  const [nuevaSeccion, setNuevaSeccion] = useState("");
  const [errorSeccion, setErrorSeccion] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<
    | { que: "gasto"; gasto: GastoDeGrupo }
    | { que: "seccion"; seccion: Seccion }
    | { que: "grupo" }
    | null
  >(null);

  // Cada sección con lo suyo, más lo que quedó sin sección si hay algo.
  const resumenes = useMemo(() => {
    const mapa = new Map<string, Resumen>(
      secciones.map((s) => [s.id, { id: s.id, nombre: s.nombre, UYU: 0, USD: 0, cantidad: 0, enPesos: 0 }])
    );
    for (const gasto of gastos) {
      const clave = gasto.seccionId && mapa.has(gasto.seccionId) ? gasto.seccionId : SIN_SECCION;
      const resumen =
        mapa.get(clave) ?? { id: SIN_SECCION, nombre: "Sin sección", UYU: 0, USD: 0, cantidad: 0, enPesos: 0 };
      resumen[gasto.moneda] += gasto.monto;
      resumen.cantidad++;
      resumen.enPesos += gasto.enPesos;
      mapa.set(clave, resumen);
    }
    return [...mapa.values()];
  }, [secciones, gastos]);

  const totalEnPesos = resumenes.reduce((suma, r) => suma + r.enPesos, 0);
  const resumenElegido = resumenes.find((r) => r.id === elegido) ?? null;
  // Si la sección elegida se borró, se vuelve a mirar todo el grupo.
  const filtro = resumenElegido ? elegido : null;
  const seccionDelGasto = filtro && filtro !== SIN_SECCION ? filtro : null;

  const visibles = filtro
    ? gastos.filter((g) => (g.seccionId ?? SIN_SECCION) === filtro)
    : gastos;

  // Los movimientos, por mes: del más nuevo al más viejo, como llegan.
  const meses: { clave: string; gastos: GastoDeGrupo[]; UYU: number; USD: number }[] = [];
  for (const gasto of visibles) {
    const clave = gasto.fecha.slice(0, 7);
    let mes = meses[meses.length - 1];
    if (!mes || mes.clave !== clave) {
      mes = { clave, gastos: [], UYU: 0, USD: 0 };
      meses.push(mes);
    }
    mes.gastos.push(gasto);
    mes[gasto.moneda] += gasto.monto;
  }

  const nombreDeSeccion = (id: string | null) => secciones.find((s) => s.id === id)?.nombre ?? null;

  /** Un pedido a la API con el manejo de errores de siempre. */
  async function pedir(url: string, metodo: string, cuerpo?: unknown) {
    const res = await fetch(url, {
      method: metodo,
      headers: cuerpo ? { "Content-Type": "application/json" } : undefined,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    const datos = await res.json().catch(() => ({}));
    return { ok: res.ok, error: (datos.error as string | undefined) ?? null };
  }

  async function anotarGasto(e: React.FormEvent) {
    e.preventDefault();
    if (ocupado) return;
    setError(null);

    const montoNumerico = parseMoneyInput(monto);
    if (!Number.isFinite(montoNumerico) || montoNumerico <= 0) {
      setError("Escribí un monto mayor que cero.");
      enfocarCampoConError("monto-grupo");
      return;
    }

    setOcupado(true);
    try {
      const res = await pedir("/api/expenses", "POST", {
        amount: montoNumerico,
        currency: moneda,
        categoryId: categoriaId,
        date: new Date(fecha).toISOString(),
        description: descripcion || undefined,
        grupoId: grupo.id,
        seccionId: seccionDelGasto,
      });
      if (!res.ok) {
        setError(res.error ?? "No se pudo cargar el gasto.");
        return;
      }
      mostrarAviso(`Gasto de ${formatMoney(montoNumerico, moneda)} cargado.`);
      setMonto("");
      setDescripcion("");
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  async function agregarSeccion(e: React.FormEvent) {
    e.preventDefault();
    if (ocupado || nuevaSeccion.trim() === "") return;
    setErrorSeccion(null);
    setOcupado(true);
    try {
      const res = await pedir(`/api/grupos/${grupo.id}/secciones`, "POST", { nombre: nuevaSeccion });
      if (!res.ok) {
        setErrorSeccion(res.error ?? "No se pudo agregar la sección.");
        return;
      }
      setNuevaSeccion("");
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  async function ejecutarConfirmado() {
    const pedido = confirmar;
    setConfirmar(null);
    if (!pedido) return;

    if (pedido.que === "gasto") {
      const res = await pedir(`/api/expenses/${pedido.gasto.id}`, "DELETE");
      if (res.ok) mostrarAviso("Gasto borrado.");
      router.refresh();
    } else if (pedido.que === "seccion") {
      await pedir(`/api/grupos/${grupo.id}/secciones/${pedido.seccion.id}`, "DELETE");
      setElegido(null);
      router.refresh();
    } else {
      const res = await pedir(`/api/grupos/${grupo.id}`, "DELETE");
      if (res.ok) {
        router.push("/grupos");
        router.refresh();
      }
    }
  }

  async function usarSecciones() {
    if (ocupado) return;
    setOcupado(true);
    try {
      await pedir(`/api/grupos/${grupo.id}`, "PATCH", { usaSecciones: true });
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  async function archivar(archivado: boolean) {
    if (ocupado) return;
    setOcupado(true);
    try {
      await pedir(`/api/grupos/${grupo.id}`, "PATCH", { archivado });
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  const nombreDelMes = (clave: string) => {
    const [anio, mes] = clave.split("-").map(Number);
    return new Intl.DateTimeFormat("es-UY", { month: "long", year: "numeric", timeZone: "UTC" }).format(
      new Date(Date.UTC(anio, mes - 1, 1))
    );
  };

  /** El mosaico en una proporción dada; se dibuja uno para PC y otro para celular. */
  function verMovimientos() {
    document
      .getElementById("titulo-movimientos")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function pedirBorrarSeccion(id: string, nombre: string) {
    setConfirmar({ que: "seccion", seccion: { id, nombre } });
  }

  /**
   * El mosaico en una proporción dada; se dibuja uno para PC y otro para
   * celular. Las acciones de la sección elegida van en una barra debajo.
   */
  function dibujarMosaico(proporcion: number, className: string) {
    const piezas = trazarMosaico(
      resumenes.map((r) => ({ dato: r, peso: r.enPesos })),
      proporcion
    );
    // Una pieza angosta o baja muestra solo el nombre y un monto.
    const esChica = (ancho: number, alto: number) => ancho * proporcion < 34 || alto < 38;
    const elegida = piezas.find((p) => p.dato.id === filtro);

    return (
      <div className={className}>
        <div className={estilos.mosaico} style={{ aspectRatio: String(proporcion) }}>
          {piezas.map(({ dato, x, y, ancho, alto }, i) => {
            const chica = esChica(ancho, alto);
            const activa = filtro === dato.id;
            return (
              <div
                key={dato.id}
                className={`${estilos.seccion} ${chica ? estilos.chica : ""} ${
                  activa ? estilos.activa : ""
                } ${dato.id === SIN_SECCION ? estilos.sinSeccion : dato.cantidad === 0 ? estilos.vacia : ""}`}
                style={
                  {
                    left: `${x}%`,
                    top: `${y}%`,
                    width: `${ancho}%`,
                    height: `${alto}%`,
                    "--peso": totalEnPesos > 0 ? dato.enPesos / totalEnPesos : 0,
                    animationDelay: `${i * 40}ms`,
                  } as React.CSSProperties
                }
              >
                <div className={estilos.seccionCaja}>
                  {/* Toda la pieza se puede tocar para elegirla. */}
                  <button
                    type="button"
                    aria-pressed={activa}
                    onClick={() => setElegido(activa ? null : dato.id)}
                    title={`${dato.nombre}: ${dato.cantidad} ${dato.cantidad === 1 ? "gasto" : "gastos"}`}
                    className={estilos.seleccionar}
                  >
                    <span className="sr-only">
                      {activa ? `Dejar de filtrar por ${dato.nombre}` : `Filtrar por ${dato.nombre}`}
                    </span>
                  </button>

                  <span className={estilos.seccionNombre}>{dato.nombre}</span>

                  <span className="monto flex min-w-0 flex-col text-xs leading-snug">
                    {dato.cantidad === 0 ? (
                      <span className="text-tenue">{chica ? "—" : "Sin gastos"}</span>
                    ) : (
                      <>
                        {dato.UYU > 0 && <span className="truncate">{formatMoney(dato.UYU, "UYU")}</span>}
                        {dato.USD > 0 && (!chica || dato.UYU === 0) && (
                          <span className="truncate text-dolar">{formatMoney(dato.USD, "USD")}</span>
                        )}
                        {!chica && (
                          <span className="mt-0.5 font-sans text-tenue">
                            {dato.cantidad} {dato.cantidad === 1 ? "gasto" : "gastos"}
                          </span>
                        )}
                      </>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {elegida && (
          <div className="desplegar mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[10px] border border-borde bg-superficie px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-texto">{elegida.dato.nombre}</p>
              <p className="mt-0.5 text-xs text-tenue">
                {elegida.dato.cantidad} {elegida.dato.cantidad === 1 ? "gasto" : "gastos"}
                {elegida.dato.id !== SIN_SECCION &&
                  elegida.dato.cantidad > 0 &&
                  " · si la borrás, sus gastos quedan sin sección"}
              </p>
            </div>
            <span className="flex shrink-0 gap-2">
              <button type="button" onClick={verMovimientos} className={estilos.accionSeccion}>
                Ver
              </button>
              {!grupo.archivado && elegida.dato.id !== SIN_SECCION && (
                <button
                  type="button"
                  onClick={() => pedirBorrarSeccion(elegida.dato.id, elegida.dato.nombre)}
                  className={`${estilos.accionSeccion} ${estilos.accionPeligro}`}
                >
                  Borrar
                </button>
              )}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={estilos.sala} style={{ "--grupo": grupo.color } as React.CSSProperties}>
      {/* ---------------------------------------------------------------- */}
      {grupo.usaSecciones ? (
        <section aria-labelledby="titulo-secciones">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="titulo-secciones" className="rotulo">Secciones</h2>
            {resumenes.length > 0 && (
              <p className="text-xs text-tenue">
                Cada una ocupa lo que se gastó en ella. Tocá una para filtrar.
              </p>
            )}
          </div>

          {resumenes.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-borde-fuerte px-6 py-10 text-center">
              <p className="text-sm font-medium text-texto">Este grupo todavía no tiene secciones</p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-suave">
                Sirven para ver cuánto se fue en cada parte. Agregá la primera acá abajo.
              </p>
            </div>
          ) : (
            // El margen negativo compensa el aire de cada pieza, para que el
            // mosaico quede alineado con el resto de la página.
            <div className="-m-[3px]">
              {dibujarMosaico(2.3, "hidden sm:block")}
              {dibujarMosaico(1, "sm:hidden")}
            </div>
          )}

          {!grupo.archivado && (
            <form onSubmit={agregarSeccion} className="mt-4 flex gap-2">
              <input
                value={nuevaSeccion}
                onChange={(e) => setNuevaSeccion(e.target.value)}
                placeholder="Nueva sección"
                aria-label="Nombre de la nueva sección"
                maxLength={MAXIMO_NOMBRE_SECCION}
                className="campo min-w-0 flex-1 sm:max-w-xs"
              />
              <button
                type="submit"
                disabled={ocupado || nuevaSeccion.trim() === ""}
                className="boton-linea shrink-0 disabled:opacity-45"
              >
                Agregar
              </button>
            </form>
          )}
          {errorSeccion && (
            <div className="mt-2">
              <Aviso tono="error">{errorSeccion}</Aviso>
            </div>
          )}
        </section>
      ) : (
        // Sin secciones los gastos van en una sola lista. Si después hacen
        // falta, se prenden acá; apagarlas no, para no dejar gastos colgando.
        !grupo.archivado && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-dashed border-borde-fuerte px-4 py-3">
            <p className="text-sm text-suave">
              Este grupo no se divide en secciones: todos sus gastos van juntos.
            </p>
            <button
              type="button"
              disabled={ocupado}
              onClick={usarSecciones}
              className="boton-linea py-1.5"
            >
              Dividir en secciones
            </button>
          </div>
        )
      )}

      {/* ---------------------------------------------------------------- */}
      {!grupo.archivado && (
        <section aria-label="Cargar un gasto">
          {!anotando ? (
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => setAnotando(true)} className="boton">
                <span aria-hidden className="text-base leading-none">+</span>
                Cargar gasto
                {seccionDelGasto && ` en ${nombreDeSeccion(seccionDelGasto)}`}
              </button>
              {aviso && <Aviso tono="ok">{aviso}</Aviso>}
            </div>
          ) : (
            <form onSubmit={anotarGasto} className="tarjeta flex flex-col gap-5 p-4 sm:p-5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="rotulo">Nuevo gasto en {grupo.nombre}</p>
                <button
                  type="button"
                  onClick={() => setAnotando(false)}
                  className="text-sm text-suave underline underline-offset-4 hover:text-texto"
                >
                  Cerrar
                </button>
              </div>

              <CampoMonto
                id="monto-grupo"
                idError={error ? "error-gasto-grupo" : undefined}
                monto={monto}
                alCambiarMonto={setMonto}
                moneda={moneda}
                alCambiarMoneda={setMoneda}
                nombreGrupo="moneda-gasto-grupo"
              />

              {/* La misma sección que está elegida en el mosaico: cambiarla acá
                  o tocarla allá es lo mismo. */}
              {secciones.length > 0 && (
                <fieldset>
                  <legend className="rotulo mb-2">Sección</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {[{ id: "", nombre: "Sin sección" }, ...secciones].map((seccion) => {
                      const activa = seccion.id === (seccionDelGasto ?? "");
                      return (
                        <label key={seccion.id || "ninguna"} className="ficha">
                          <input
                            type="radio"
                            name="seccion-gasto-grupo"
                            value={seccion.id}
                            checked={activa}
                            onChange={() => setElegido(seccion.id || null)}
                            className="sr-only"
                          />
                          <span
                            style={
                              activa
                                ? {
                                    borderColor: grupo.color,
                                    backgroundColor: `color-mix(in srgb, ${grupo.color} 14%, transparent)`,
                                    color: "var(--texto)",
                                  }
                                : undefined
                            }
                          >
                            {seccion.nombre}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              <CampoCategoria
                categorias={categorias}
                valor={categoriaId}
                alCambiar={setCategoriaId}
                nombreGrupo="categoria-gasto-grupo"
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="fecha-grupo" className="rotulo">Fecha</label>
                  <input
                    id="fecha-grupo"
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    required
                    className="campo monto"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="descripcion-grupo" className="rotulo">Descripción</label>
                  <input
                    id="descripcion-grupo"
                    type="text"
                    placeholder="Opcional"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    maxLength={200}
                    className="campo"
                  />
                </div>
              </div>

              {categorias.length === 0 && (
                <p className="text-sm text-suave">
                  Necesitás al menos una categoría para cargar un gasto.{" "}
                  <Link href="/categories" className="text-peso underline underline-offset-2">
                    Crear una
                  </Link>
                </p>
              )}

              {error && <Aviso id="error-gasto-grupo" tono="error">{error}</Aviso>}

              <div className="flex flex-wrap items-center gap-3 border-t border-borde pt-4">
                {aviso ? (
                  <Aviso tono="ok">{aviso}</Aviso>
                ) : (
                  <p className="text-xs text-tenue">También cuenta en tu mes, marcado como del grupo.</p>
                )}
                <button
                  type="submit"
                  disabled={ocupado || categorias.length === 0}
                  className="boton ml-auto"
                >
                  {ocupado ? "Cargando..." : "Cargar gasto"}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      <section aria-labelledby="titulo-movimientos">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="titulo-movimientos" className="rotulo">
            Movimientos{resumenElegido ? ` · ${resumenElegido.nombre}` : ""}
          </h2>
          <p className="monto text-xs text-tenue">
            {visibles.length} {visibles.length === 1 ? "gasto" : "gastos"}
          </p>
        </div>

        {visibles.length === 0 ? (
          <p className="rounded-[10px] border border-dashed border-borde-fuerte px-6 py-8 text-center text-sm leading-relaxed text-suave">
            {resumenElegido
              ? `Todavía no hay gastos en ${resumenElegido.nombre}.`
              : grupo.archivado
                ? "Este grupo no llegó a tener gastos."
                : "Todavía no hay gastos. El primero que cargues aparece acá."}
          </p>
        ) : (
          <div className="flex flex-col gap-7">
            {meses.map((mes) => (
              <div key={mes.clave}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-borde pb-2">
                  <h3 className={`${estilos.mes} text-sm font-semibold text-texto`}>
                    <span className="inline-block first-letter:uppercase">{nombreDelMes(mes.clave)}</span>
                  </h3>
                  <p className="monto flex gap-3 text-xs text-suave">
                    {mes.UYU > 0 && <span>{formatMoney(mes.UYU, "UYU")}</span>}
                    {mes.USD > 0 && <span className="text-dolar">{formatMoney(mes.USD, "USD")}</span>}
                  </p>
                </div>

                <ul className="flex flex-col">
                  {mes.gastos.map((gasto) => {
                    const seccion = nombreDeSeccion(gasto.seccionId);
                    return (
                      <li
                        key={gasto.id}
                        className="flex items-center gap-3 border-borde py-3 not-first:border-t"
                      >
                        <span className="monto w-7 shrink-0 text-sm text-tenue">
                          {gasto.fecha.slice(8, 10)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-texto">
                            {gasto.descripcion || gasto.categoria}
                          </p>
                          {((seccion && !resumenElegido) || gasto.descripcion) && (
                            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-tenue">
                              {seccion && !resumenElegido && (
                                <span className={estilos.etiqueta}>{seccion}</span>
                              )}
                              {gasto.descripcion && <span>{gasto.categoria}</span>}
                            </p>
                          )}
                        </div>
                        <span
                          className={`monto shrink-0 text-sm ${
                            gasto.moneda === "UYU" ? "text-texto" : "text-dolar"
                          }`}
                        >
                          {formatMoney(gasto.monto, gasto.moneda)}
                        </span>
                        {!grupo.archivado && (
                          <button
                            type="button"
                            onClick={() => setConfirmar({ que: "gasto", gasto })}
                            className="boton-mini boton-mini-peligro shrink-0"
                          >
                            Eliminar
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      <section aria-labelledby="titulo-cierre">
        <h2 id="titulo-cierre" className="rotulo mb-3">Cuando termine</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Archivar es lo esperable cuando algo termina: va primero y es
              reversible. Borrar queda al lado, con su advertencia. */}
          <div className="tarjeta flex flex-col gap-4 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-borde bg-superficie-alta text-suave"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-[18px] w-[18px]"
                >
                  <rect x="3.5" y="4.5" width="17" height="4.5" rx="1" />
                  <path d="M5 9v9.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V9M10 13h4" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-texto">
                  {grupo.archivado ? "Reabrir el grupo" : "Archivar el grupo"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-suave">
                  {grupo.archivado
                    ? "Vuelve a la lista principal y se le pueden cargar gastos otra vez."
                    : "Para cuando ya terminó. Sale de la lista principal y no admite gastos nuevos, pero queda guardado para consultarlo y se puede reabrir."}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => archivar(!grupo.archivado)}
              className="boton-linea mt-auto self-start"
            >
              {grupo.archivado ? "Reabrir" : "Archivar"}
            </button>
          </div>

          <div className="tarjeta flex flex-col gap-4 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-borde bg-superficie-alta text-suave"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-[18px] w-[18px]"
                >
                  <path d="M4.5 7h15M9.5 7V5h5v2M6.5 7l1 12.5h9l1-12.5M10 11v5.5M14 11v5.5" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-texto">Borrar el grupo</p>
                <p className="mt-1 text-xs leading-relaxed text-suave">
                  Se borran el grupo y sus secciones, y no se puede deshacer.
                  {gastos.length === 1 && " Su gasto no se pierde: queda como un gasto común en tu mes."}
                  {gastos.length > 1 &&
                    ` Sus ${gastos.length} gastos no se pierden: quedan como gastos comunes en tus meses.`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setConfirmar({ que: "grupo" })}
              className="boton-linea mt-auto self-start hover:border-alerta hover:text-alerta"
            >
              Borrar
            </button>
          </div>
        </div>
      </section>

      <Confirmar
        abierto={confirmar !== null}
        titulo={
          confirmar?.que === "gasto"
            ? "¿Borrar este gasto?"
            : confirmar?.que === "seccion"
              ? `¿Borrar la sección ${confirmar.seccion.nombre}?`
              : `¿Borrar ${grupo.nombre}?`
        }
        detalle={
          confirmar?.que === "gasto"
            ? `${confirmar.gasto.descripcion || confirmar.gasto.categoria}, ${formatMoney(confirmar.gasto.monto, confirmar.gasto.moneda)}. Se borra del grupo y también de tu mes.`
            : confirmar?.que === "seccion"
              ? "Sus gastos siguen en el grupo, sin sección."
              : "Se borran el grupo y sus secciones. Sus gastos quedan como gastos comunes en los meses donde estaban."
        }
        textoConfirmar="Borrar"
        alConfirmar={ejecutarConfirmado}
        alCancelar={() => setConfirmar(null)}
      />
    </div>
  );
}
