"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Category } from "@/lib/types";
import { CampoMonto, CampoCategoria, Conmutador } from "@/components/CamposGasto";
import { Aviso, enfocarCampoConError } from "@/components/Aviso";
import { NuevaCategoria } from "@/components/NuevaCategoria";
import { IconoTicket, IconoCalendario, IconoGrupo } from "@/components/navegacion";
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
function hoyLocal() {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
}

const TIPOS: {
  valor: Tipo;
  titulo: string;
  detalle: string;
  icono: React.ReactNode;
}[] = [
  {
    valor: "comun",
    titulo: "Común",
    detalle: "Una vez",
    icono: <IconoTicket className="h-5 w-5" />,
  },
  {
    valor: "fijo",
    titulo: "Fijo",
    detalle: "Cada mes",
    icono: <IconoCalendario className="h-5 w-5" />,
  },
  {
    valor: "grupal",
    titulo: "Grupal",
    detalle: "Compartido",
    icono: <IconoGrupo className="h-5 w-5" />,
  },
];

/**
 * La ventana del +: un solo lugar para cargar cualquier gasto. Arriba se
 * elige el tipo (común, fijo o grupal) y debajo cambian solo las preguntas
 * que dependen de él; el monto, la categoría y la descripción se conservan
 * al cambiar de tipo. El grupal no se carga acá: se elige el grupo y se abre
 * su propio formulario, que sabe quién pagó y para quién es.
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
  const [ocupado, setOcupado] = useState(false);
  const [creandoCategoria, setCreandoCategoria] = useState(false);

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

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : []))
      .then((datos: Category[]) => {
        setCategorias(datos);
        if (datos.length > 0) setCategoriaId((actual) => actual || datos[0].id);
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

    if (!Number.isFinite(montoNumerico) || montoNumerico <= 0) {
      setError("Escribí un monto mayor que cero.");
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

      const mensaje =
        tipo === "comun"
          ? `Gasto de ${formatMoney(montoNumerico, moneda)} cargado.`
          : modoFijo === "cuotas"
            ? `Gasto fijo en ${cantidadCuotas} cuotas creado.`
            : "Gasto fijo creado.";
      window.dispatchEvent(new CustomEvent(EVENTO_GASTO_CARGADO, { detail: { tipo, mensaje } }));
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
      >
        <form onSubmit={guardar} className="flex max-h-[inherit] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-borde px-5 py-4">
            <h2 id="nuevo-gasto-titulo" className="seccion-titulo">
              Nuevo gasto
            </h2>
            <button type="button" onClick={alCerrar} aria-label="Cerrar" className="boton-mini -mr-2">
              <span aria-hidden>✕</span>
            </button>
          </div>

          <div className="flex flex-col gap-6 overflow-y-auto px-5 py-5">
            {/* El tipo va primero porque decide qué más se pregunta. */}
            <fieldset className="min-w-0">
              <legend className="sr-only">Tipo de gasto</legend>
              <div className="grid grid-cols-3 gap-2">
                {TIPOS.map((t) => {
                  const activo = t.valor === tipo;
                  return (
                    <label key={t.valor} className="cursor-pointer">
                      <input
                        type="radio"
                        name="tipo-gasto"
                        value={t.valor}
                        checked={activo}
                        onChange={() => {
                          setTipo(t.valor);
                          setError(null);
                        }}
                        className="peer sr-only"
                      />
                      <span
                        className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-foco ${
                          activo
                            ? "border-foco/70 bg-foco/10 text-texto"
                            : "border-borde bg-fondo text-suave hover:border-borde-fuerte hover:text-texto"
                        }`}
                      >
                        <span aria-hidden>{t.icono}</span>
                        <span className="text-sm font-medium">{t.titulo}</span>
                        <span className="text-xs text-tenue">{t.detalle}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

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
                          href={`/grupos/${g.id}?cargar=1`}
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
                  Se abre el formulario del grupo, para elegir quién pagó y para quién es.
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

                <CampoMonto
                  id="monto-nuevo"
                  idError={error ? "error-nuevo-gasto" : undefined}
                  monto={monto}
                  alCambiarMonto={setMonto}
                  moneda={moneda}
                  alCambiarMoneda={setMoneda}
                  nombreGrupo="moneda-nuevo"
                />

                <CampoCategoria
                  categorias={categorias ?? []}
                  valor={categoriaId}
                  alCambiar={setCategoriaId}
                  nombreGrupo="categoria-nuevo"
                  alCrearNueva={() => setCreandoCategoria(true)}
                />

                {tipo === "comun" ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="fecha-nuevo" className="rotulo">
                        Fecha
                      </label>
                      <input
                        id="fecha-nuevo"
                        type="date"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        required
                        className="campo monto"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="descripcion-nuevo" className="rotulo">
                        Descripción
                      </label>
                      <input
                        id="descripcion-nuevo"
                        type="text"
                        placeholder="Opcional"
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        className="campo"
                      />
                    </div>
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
            <div className="flex items-center justify-end gap-3 border-t border-borde px-5 py-4">
              <button type="button" onClick={alCerrar} className="boton-linea">
                Cancelar
              </button>
              <button type="submit" disabled={ocupado || !categorias || sinCategorias} className="boton">
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
