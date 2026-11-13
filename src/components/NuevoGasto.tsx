"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Category } from "@/lib/types";
import { CampoMonto, CampoCategoria, Conmutador } from "@/components/CamposGasto";
import { Aviso, enfocarCampoConError } from "@/components/Aviso";
import { NuevaCategoria } from "@/components/NuevaCategoria";
import type { DatosTicket } from "@/components/TicketGasto";
import { IconoCalendario } from "@/components/navegacion";
import { formatMoney, parseMoneyInput } from "@/lib/format";
import { monthYearLabel, dateToMonthInput, primerMesDeCobro, mesFinalDeCuotas, diaDeCobroYaPaso } from "@/lib/month";

export type Origen = { x: number; y: number; ancho: number; alto: number };
type Tipo = "comun" | "fijo" | "grupal";
type GrupoCorto = { id: string; nombre: string; color: string };

/** El aviso que se muestra al cerrar la ventana (lo escucha AvisoGlobal). */
export const EVENTO_GASTO_CARGADO = "gasto-cargado";

/** La caja del botón que abre la ventana, para que se expanda desde ahí. */
export function origenDe(el: HTMLElement): Origen {
  const caja = el.getBoundingClientRect();
  return {
    x: caja.left + caja.width / 2,
    y: caja.top + caja.height / 2,
    ancho: caja.width,
    alto: caja.height,
  };
}

/** La fecha de hoy en el reloj de quien carga (no en UTC). */
function hoyLocal(desplazamiento = 0) {
  const ahora = new Date();
  ahora.setDate(ahora.getDate() + desplazamiento);
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
}

/** "Hoy", "Ayer" o "11 nov", para la ficha de la fecha. */
function textoFecha(fecha: string) {
  if (fecha === hoyLocal()) return "Hoy";
  if (fecha === hoyLocal(-1)) return "Ayer";
  return new Intl.DateTimeFormat("es-UY", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${fecha}T00:00:00Z`)
  );
}

const TIPOS: { valor: Tipo; texto: string }[] = [
  { valor: "comun", texto: "Común" },
  { valor: "fijo", texto: "Fijo" },
  { valor: "grupal", texto: "Grupal" },
];

/** Las últimas categorías usadas en este dispositivo, la más nueva primero. */
const CLAVE_RECIENTES = "bt-categorias-recientes";

function leerRecientes(): string[] {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_RECIENTES) ?? "[]");
    return Array.isArray(datos) ? datos.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function guardarReciente(id: string) {
  try {
    const lista = [id, ...leerRecientes().filter((x) => x !== id)].slice(0, 6);
    localStorage.setItem(CLAVE_RECIENTES, JSON.stringify(lista));
  } catch {
    // Sin almacenamiento, la próxima vez arranca en la primera categoría.
  }
}

/**
 * La ventana del +: un solo lugar para cargar cualquier gasto, pensada para
 * que el caso de todos los días sea + → monto → categoría → guardar.
 *
 * Abre con el monto enfocado. Arriba, un conmutador chico elige el tipo
 * (común, fijo o grupal), que casi siempre queda en común. La categoría
 * arranca en la última usada y las recientes están a un toque; la fecha
 * (casi siempre hoy) y la nota van en fichas que se abren si hacen falta.
 * El monto, la categoría y la descripción se conservan al cambiar de tipo.
 * El grupal no se carga acá: se elige el grupo y se abre su formulario,
 * con el monto ya escrito.
 */
export function NuevoGasto({ origen = null, alCerrar }: { origen?: Origen | null; alCerrar: () => void }) {
  const router = useRouter();
  const dialogo = useRef<HTMLDialogElement>(null);

  const [tipo, setTipo] = useState<Tipo>("comun");
  const [categorias, setCategorias] = useState<Category[] | null>(null);
  const [grupos, setGrupos] = useState<GrupoCorto[] | null>(null);

  const [monto, setMonto] = useState("");
  const [moneda, setMoneda] = useState<"UYU" | "USD">("UYU");
  const [categoriaId, setCategoriaId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  // Común
  const [fecha, setFecha] = useState(hoyLocal());
  // Fijo: "siempre" = alquiler, abono. "cuotas" = una compra financiada.
  const [dia, setDia] = useState(String(Math.min(new Date().getDate(), 28)));
  const [modoFijo, setModoFijo] = useState<"siempre" | "cuotas">("siempre");
  const [cuotas, setCuotas] = useState("12");

  const [error, setError] = useState<string | null>(null);
  /** El error del monto va pegado al campo; `error` queda para lo demás. */
  const [errorMonto, setErrorMonto] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [creandoCategoria, setCreandoCategoria] = useState(false);
  const [recientes, setRecientes] = useState<string[]>([]);
  const [conNota, setConNota] = useState(false);

  useEffect(() => {
    const el = dialogo.current;
    if (!el) return;
    if (!origen) {
      el.showModal();
      return;
    }
    // Nace del botón que la abrió: se mide ya abierta y sin animación para
    // saber desde dónde expandirse (igual que FormularioGastoGrupal).
    el.style.animation = "none";
    el.showModal();
    const caja = el.getBoundingClientRect();
    el.style.setProperty("--desde-x", `${origen.x - (caja.left + caja.width / 2)}px`);
    el.style.setProperty("--desde-y", `${origen.y - (caja.top + caja.height / 2)}px`);
    el.style.setProperty("--desde-sx", String(origen.ancho / caja.width));
    el.style.setProperty("--desde-sy", String(origen.alto / caja.height));
    el.classList.add("hoja-expandida");
    el.style.animation = "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lo primero que se hace es escribir el monto: el foco va ahí y no a la ✕.
  useEffect(() => {
    document.getElementById("monto-nuevo")?.focus({ preventScroll: true });
  }, []);

  // Con el teclado del teléfono abierto, la hoja sube por encima de él (ver
  // .hoja en globals.css) para que "Cargar gasto" no quede tapado.
  useEffect(() => {
    const vista = window.visualViewport;
    const el = dialogo.current;
    if (!vista || !el) return;
    function medir() {
      const tapado = Math.max(0, window.innerHeight - vista!.height - vista!.offsetTop);
      el!.style.setProperty("--teclado", `${Math.round(tapado)}px`);
    }
    vista.addEventListener("resize", medir);
    vista.addEventListener("scroll", medir);
    return () => {
      vista.removeEventListener("resize", medir);
      vista.removeEventListener("scroll", medir);
    };
  }, []);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : []))
      .then((datos: Category[]) => {
        setCategorias(datos);
        // Arranca en la última usada; si no hay, en la primera.
        const usadas = leerRecientes().filter((id) => datos.some((c) => c.id === id));
        setRecientes(usadas);
        if (datos.length > 0) setCategoriaId((actual) => actual || usadas[0] || datos[0].id);
      })
      .catch(() => setCategorias([]));
  }, []);

  useEffect(() => {
    if (tipo !== "grupal" || grupos !== null) return;
    fetch("/api/grupos")
      .then((r) => (r.ok ? r.json() : []))
      .then((datos: GrupoCorto[]) => setGrupos(datos))
      .catch(() => setGrupos([]));
  }, [tipo, grupos]);

  // Lo que el fijo traduce a meses antes de guardar.
  const numeroDia = Number(dia) || 1;
  const cantidadCuotas = Number(cuotas);
  const mesFinal = modoFijo === "cuotas" ? mesFinalDeCuotas(cantidadCuotas, numeroDia) : null;
  const montoNumerico = parseMoneyInput(monto);
  const totalFinanciado = mesFinal && montoNumerico > 0 ? montoNumerico * cantidadCuotas : null;
  const resumenFijo =
    modoFijo === "siempre"
      ? "Se repite todos los meses, sin fecha de fin."
      : mesFinal
        ? `${cantidadCuotas} ${cantidadCuotas === 1 ? "cuota" : "cuotas"}, de ${monthYearLabel(primerMesDeCobro(numeroDia))} a ${monthYearLabel(mesFinal)}.`
        : "Escribí en cuántas cuotas se paga.";

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (ocupado || tipo === "grupal") return;
    setError(null);
    setErrorMonto(null);

    if (!monto.trim()) {
      setErrorMonto("Escribí cuánto gastaste.");
      enfocarCampoConError("monto-nuevo");
      return;
    }
    if (!Number.isFinite(montoNumerico) || montoNumerico <= 0) {
      setErrorMonto("El monto tiene que ser mayor que cero.");
      enfocarCampoConError("monto-nuevo");
      return;
    }

    setOcupado(true);
    try {
      const res =
        tipo === "comun"
          ? await fetch("/api/expenses", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                amount: montoNumerico,
                currency: moneda,
                categoryId: categoriaId,
                date: new Date(fecha).toISOString(),
                description: descripcion || undefined,
              }),
            })
          : await fetch("/api/recurring", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                amount: montoNumerico,
                currency: moneda,
                categoryId: categoriaId,
                dayOfMonth: numeroDia,
                description: descripcion || undefined,
                endsOn: mesFinal ? dateToMonthInput(mesFinal) : null,
              }),
            });
      if (!res.ok) {
        const datos = await res.json().catch(() => ({}));
        setError(datos.error ?? "No se pudo cargar el gasto.");
        return;
      }
      const creado: { id?: string } = await res.json().catch(() => ({}));
      guardarReciente(categoriaId);

      const mensaje =
        tipo === "comun"
          ? `Gasto de ${formatMoney(montoNumerico, moneda)} cargado.`
          : modoFijo === "cuotas"
            ? `Gasto fijo en ${cantidadCuotas} cuotas creado.`
            : "Gasto fijo creado.";

      // Los datos del ticket que sale al guardar (ver TicketGasto).
      const categoria = categorias?.find((c) => c.id === categoriaId);
      const nombreCategoria = categoria?.name ?? "Gasto";
      const diaDeFecha = new Date(`${fecha}T00:00:00Z`);
      const ticket: DatosTicket = {
        tipo: tipo === "comun" ? "comun" : "fijo",
        // Para "Deshacer": borra lo recién creado. Un fijo deshecho se lleva
        // también el gasto de este mes que se haya generado al crearlo.
        deshacer: creado.id
          ? tipo === "comun"
            ? `/api/expenses/${creado.id}`
            : `/api/recurring/${creado.id}?deshacer=1`
          : null,
        titulo: descripcion.trim() || nombreCategoria,
        categoria: nombreCategoria,
        emoji: categoria?.emoji ?? null,
        monto: montoNumerico,
        moneda,
        cuando:
          tipo === "comun"
            ? new Intl.DateTimeFormat("es-UY", { day: "numeric", month: "short", timeZone: "UTC" }).format(diaDeFecha)
            : `Día ${numeroDia}`,
        pie:
          tipo === "comun"
            ? `Suma a ${new Intl.DateTimeFormat("es-UY", { month: "long", timeZone: "UTC" }).format(diaDeFecha).toLowerCase()}`
            : modoFijo === "cuotas" && mesFinal
              ? `${cantidadCuotas} ${cantidadCuotas === 1 ? "cuota" : "cuotas"}, hasta ${monthYearLabel(mesFinal)}`
              : `Se carga solo el ${numeroDia} de cada mes`,
      };
      window.dispatchEvent(new CustomEvent(EVENTO_GASTO_CARGADO, { detail: { tipo, mensaje, ticket } }));
      router.refresh();
      alCerrar();
    } finally {
      setOcupado(false);
    }
  }

  const sinCategorias = categorias !== null && categorias.length === 0;

  // Va directo en el <body>: el + del celular vive dentro de la barra
  // flotante, y dentro de ella los rótulos toman el estilo de la barra.
  return createPortal(
    <>
      <dialog
        ref={dialogo}
        className="dialogo hoja"
        aria-labelledby="nuevo-gasto-titulo"
        onCancel={(e) => {
          e.preventDefault();
          alCerrar();
        }}
        onClick={(e) => {
          // Un toque en el fondo cierra, como la hoja de categorías; pero no
          // si ya escribiste un monto, para no perderlo por un toque de más.
          if (e.target === e.currentTarget && !monto.trim()) alCerrar();
        }}
      >
        <form onSubmit={guardar} noValidate className="flex max-h-[inherit] flex-col">
          <div className="flex flex-col gap-3 border-b border-borde px-5 pb-4 pt-4">
            <div className="flex items-center justify-between gap-3">
              <h2 id="nuevo-gasto-titulo" className="seccion-titulo">
                Nuevo gasto
              </h2>
              <button type="button" onClick={alCerrar} aria-label="Cerrar" className="boton-mini -mr-2">
                <span aria-hidden>✕</span>
              </button>
            </div>
            {/* El tipo: casi siempre queda en común, así que es un conmutador
                chico y no tres tarjetas grandes por encima del monto. */}
            <div className="[&_.segmento>span]:px-2 [&_.segmentos]:w-full">
              <Conmutador
                nombreGrupo="tipo-gasto"
                etiqueta="Tipo de gasto"
                valor={tipo}
                alCambiar={(t) => {
                  setTipo(t);
                  setError(null);
                  setErrorMonto(null);
                }}
                opciones={TIPOS}
              />
            </div>
          </div>

          <div className="flex flex-col gap-6 overflow-y-auto px-5 py-5">
            {tipo === "grupal" ? (
              <div className="flex flex-col gap-2">
                <p className="rotulo">¿En qué grupo?</p>
                {grupos === null ? (
                  <p className="text-sm text-tenue">Cargando grupos...</p>
                ) : grupos.length === 0 ? (
                  <p className="text-sm text-suave">
                    Todavía no estás en ningún grupo.{" "}
                    <Link href="/grupos/nuevo" onClick={alCerrar} className="text-texto underline underline-offset-2">
                      Crear uno
                    </Link>
                  </p>
                ) : (
                  <ul className="lista">
                    {grupos.map((g) => (
                      <li key={g.id}>
                        <Link
                          href={`/grupos/${g.id}?cargar=1${montoNumerico > 0 ? `&monto=${montoNumerico}&moneda=${moneda}` : ""}`}
                          onClick={alCerrar}
                          className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-superficie-alta"
                        >
                          <span
                            aria-hidden
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: g.color }}
                          />
                          <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-texto">{g.nombre}</span>
                          <span aria-hidden className="text-tenue">
                            ›
                          </span>
                        </Link>
                      </li>
                    ))}
                    <li>
                      <Link
                        href="/grupos/nuevo"
                        onClick={alCerrar}
                        className="flex items-center gap-3 px-4 py-3 text-suave transition-colors hover:bg-superficie-alta hover:text-texto"
                      >
                        <span
                          aria-hidden
                          className="flex h-2.5 w-2.5 shrink-0 items-center justify-center text-base leading-none"
                        >
                          +
                        </span>
                        <span className="min-w-0 flex-1 text-[15px] font-medium">Nuevo grupo</span>
                        <span aria-hidden className="text-tenue">
                          ›
                        </span>
                      </Link>
                    </li>
                  </ul>
                )}
                <p className="text-xs text-tenue">
                  Se abre el formulario del grupo
                  {montoNumerico > 0 ? `, con los ${formatMoney(montoNumerico, moneda)} ya escritos,` : ""} para
                  elegir quién pagó y para quién es.
                </p>
              </div>
            ) : (
              <>
                {tipo === "fijo" && (
                  <div className="flex">
                    <Conmutador
                      nombreGrupo="modo-fijo"
                      etiqueta="Cómo se paga"
                      valor={modoFijo}
                      alCambiar={setModoFijo}
                      opciones={[
                        { valor: "siempre", texto: "Todos los meses" },
                        { valor: "cuotas", texto: "En cuotas" },
                      ]}
                    />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <CampoMonto
                    id="monto-nuevo"
                    idError={errorMonto ? "error-monto-nuevo" : undefined}
                    monto={monto}
                    alCambiarMonto={(valor) => {
                      setMonto(valor);
                      if (errorMonto) setErrorMonto(null);
                    }}
                    moneda={moneda}
                    alCambiarMoneda={setMoneda}
                    nombreGrupo="moneda-nuevo"
                  />
                  {/* El error del monto, pegado al campo, no al final del formulario. */}
                  {errorMonto && (
                    <Aviso id="error-monto-nuevo" tono="error">
                      {errorMonto}
                    </Aviso>
                  )}
                </div>

                <CampoCategoria
                  categorias={categorias ?? []}
                  valor={categoriaId}
                  alCambiar={setCategoriaId}
                  nombreGrupo="categoria-nuevo"
                  alCrearNueva={() => setCreandoCategoria(true)}
                  recientes={recientes}
                />

                {tipo === "comun" ? (
                  // Fecha y nota: casi siempre hoy y sin nota, así que van en
                  // fichas. La fecha abre el calendario; la nota, su campo.
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap gap-2">
                      <label className="ficha-extra">
                        <IconoCalendario className="h-4 w-4" />
                        <span aria-hidden>{textoFecha(fecha)}</span>
                        <span className="sr-only">Fecha: {textoFecha(fecha)}. Cambiar</span>
                        <input
                          id="fecha-nuevo"
                          type="date"
                          value={fecha}
                          max={hoyLocal()}
                          onChange={(e) => setFecha(e.target.value || hoyLocal())}
                          onClick={(e) => {
                            try {
                              e.currentTarget.showPicker?.();
                            } catch {
                              // Algunos navegadores no dejan abrirlo así; el foco alcanza.
                            }
                          }}
                        />
                      </label>
                      {!conNota && !descripcion && (
                        <button type="button" onClick={() => setConNota(true)} className="ficha-extra">
                          <span aria-hidden>+</span> Nota
                        </button>
                      )}
                    </div>
                    {(conNota || descripcion) && (
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="descripcion-nuevo" className="rotulo">
                          Nota
                        </label>
                        <input
                          id="descripcion-nuevo"
                          type="text"
                          placeholder="Ej: Supermercado de la semana"
                          value={descripcion}
                          onChange={(e) => setDescripcion(e.target.value)}
                          autoFocus={conNota}
                          enterKeyHint="done"
                          className="campo"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="flex flex-wrap gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="dia-nuevo" className="rotulo">
                            Día del mes
                          </label>
                          <input
                            id="dia-nuevo"
                            type="number"
                            inputMode="numeric"
                            min="1"
                            max="28"
                            value={dia}
                            onChange={(e) => setDia(e.target.value)}
                            required
                            className="campo monto w-24"
                          />
                        </div>
                        {modoFijo === "cuotas" && (
                          <div className="flex flex-col gap-1.5">
                            <label htmlFor="cuotas-nuevo" className="rotulo">
                              Cuotas
                            </label>
                            <input
                              id="cuotas-nuevo"
                              type="number"
                              min="1"
                              max="120"
                              step="1"
                              inputMode="numeric"
                              value={cuotas}
                              onChange={(e) => setCuotas(e.target.value)}
                              required
                              className="campo monto w-24"
                            />
                          </div>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-tenue">
                        {resumenFijo}
                        {totalFinanciado !== null && (
                          <>
                            {" "}
                            Total: <span className="monto text-suave">{formatMoney(totalFinanciado, moneda)}</span>.
                          </>
                        )}
                      </p>
                      {diaDeCobroYaPaso(numeroDia) && (
                        <p className="mt-1 text-xs text-tenue">
                          El día {numeroDia} de este mes ya pasó: el primero se carga al guardar.
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="descripcion-nuevo" className="rotulo">
                        Descripción
                      </label>
                      <input
                        id="descripcion-nuevo"
                        type="text"
                        placeholder="Ej: Alquiler"
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        className="campo"
                      />
                    </div>
                  </>
                )}

                {sinCategorias && (
                  <p className="text-sm text-suave">
                    Necesitás al menos una categoría para cargar un gasto.{" "}
                    <Link href="/categories" onClick={alCerrar} className="text-texto underline underline-offset-2">
                      Crear una
                    </Link>
                  </p>
                )}

                {error && (
                  <Aviso id="error-nuevo-gasto" tono="error">
                    {error}
                  </Aviso>
                )}
              </>
            )}
          </div>

          {tipo !== "grupal" && (
            // Un solo botón, a todo el ancho y al alcance del pulgar: cerrar ya
            // está en la ✕, en Escape y en el fondo.
            <div className="border-t border-borde px-5 py-4">
              <button type="submit" disabled={ocupado || !categorias || sinCategorias} className="boton w-full py-3 text-[15px]">
                {ocupado ? "Cargando..." : tipo === "comun" ? "Cargar gasto" : "Agregar gasto fijo"}
              </button>
            </div>
          )}
        </form>
      </dialog>
      {creandoCategoria && (
        <NuevaCategoria
          alCerrar={() => setCreandoCategoria(false)}
          alCrear={(nueva) => {
            setCategorias((previas) => [...(previas ?? []), nueva]);
            setCategoriaId(nueva.id);
            setCreandoCategoria(false);
          }}
        />
      )}
    </>,
    document.body,
  );
}
