"use client";

import { useEffect, useRef, useState } from "react";
import type { Category } from "@/lib/types";
import { CampoMonto, Conmutador } from "@/components/CamposGasto";
import { Insignia } from "@/components/Insignia";
import { Aviso, enfocarCampoConError } from "@/components/Aviso";
import { NuevaCategoria } from "@/components/NuevaCategoria";
import { EditorSeccion } from "@/components/EditorSeccion";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "@/lib/format";
import { repartirEnPartesIguales, repartirPorPartes } from "@/lib/saldos";

type Persona = { id: string; nombre: string };
type SeccionEnFormulario = { id: string; nombre: string; emoji?: string | null };
type Moneda = "UYU" | "USD";
type Modo = "iguales" | "partes" | "montos";

/** Lo que el formulario necesita de un gasto para editarlo. */
export type GastoParaEditar = {
  id: string;
  monto: number;
  moneda: Moneda;
  fecha: string;
  descripcion: string | null;
  seccionId: string | null;
  pagadorId: string;
  partes: { userId: string; monto: number }[];
  miCategoriaId: string | null;
};

/** El tope de partes por persona: alcanza para una familia grande. */
const MAXIMO_PARTES = 9;

/** La fecha de hoy en el reloj de quien carga (no en UTC, que después de las
    21 h de Uruguay ya es mañana). */
function hoyLocal() {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
}

const aTexto = (n: number) => formatMoneyInput(String(n).replace(".", ","));

/**
 * El formulario para cargar o editar un gasto del grupo, como el de Tricount:
 * cuánto fue, quién pagó y para quién es.
 *
 * "Para quién" es una lista con todos los integrantes: cada uno se suma o se
 * saca tocando su fila, así un gasto puede ser de todos, de algunos o de una
 * sola persona (le pagaste la entrada a alguien). Aparte se elige cómo se
 * divide entre los elegidos: en partes iguales, por partes (×2 paga el doble)
 * o con el monto de cada uno. Cambiar el modo no cambia a quiénes se eligió.
 *
 * Se abre encima de la página: en el celular como una hoja que sube desde
 * abajo, en PC como un cuadro. Usa el `<dialog>` nativo, así el foco queda
 * adentro y Escape cierra.
 */
export function FormularioGastoGrupal({
  grupo,
  yo,
  personas,
  secciones,
  categorias,
  gasto,
  seccionInicial,
  origen = null,
  puedeCrearSecciones = false,
  colorDelGrupo,
  alCrear,
  alCerrar,
  alGuardar,
}: {
  grupo: { id: string; nombre: string };
  yo: string;
  /** Todos los integrantes. Con una sola persona no hay reparto que elegir. */
  personas: Persona[];
  secciones: SeccionEnFormulario[];
  categorias: Category[];
  /** El gasto a editar; sin esto, se carga uno nuevo. */
  gasto: GastoParaEditar | null;
  /** La sección elegida en el mosaico, para un gasto nuevo. */
  seccionInicial: string | null;
  /** El botón que lo abrió (su caja en la pantalla): el formulario nace de él. */
  origen?: { x: number; y: number; ancho: number; alto: number } | null;
  /** El administrador puede crear secciones desde el formulario. */
  puedeCrearSecciones?: boolean;
  /** Con qué color arranca una sección nueva. */
  colorDelGrupo: string;
  /** Se creó una categoría o una sección: la página tiene que volver a traer los datos. */
  alCrear: () => void;
  alCerrar: () => void;
  /** Se guardó: el texto para el aviso. */
  alGuardar: (aviso: string) => void;
}) {
  const compartido = personas.length > 1;
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogo.current;
    if (!el) return;
    if (!origen) {
      el.showModal();
      return;
    }
    // El formulario nace del botón: hace falta saber dónde y de qué tamaño
    // queda ya abierto para calcular desde dónde se expande. Se mide sin la
    // animación (que lo mueve y lo achica) y recién después se la deja correr.
    el.style.animation = "none";
    el.showModal();
    const caja = el.getBoundingClientRect();
    el.style.setProperty("--desde-x", `${origen.x - (caja.left + caja.width / 2)}px`);
    el.style.setProperty("--desde-y", `${origen.y - (caja.top + caja.height / 2)}px`);
    el.style.setProperty("--desde-sx", String(origen.ancho / caja.width));
    el.style.setProperty("--desde-sy", String(origen.alto / caja.height));
    el.classList.add("hoja-expandida");
    el.style.animation = "";
    // Solo al montarse: el origen es el del clic que lo abrió.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si el gasto editado se reparte en partes iguales entre los que participan,
  // se abre así; si no, con el monto de cada uno.
  const inicial = (() => {
    if (!gasto) return { modo: "iguales" as Modo, para: personas.map((p) => p.id), montos: {} };
    const ids = gasto.partes.map((p) => p.userId);
    const iguales = repartirEnPartesIguales(gasto.monto, ids, gasto.pagadorId);
    const sonIguales = gasto.partes.every((p) => Math.abs((iguales.get(p.userId) ?? -1) - p.monto) < 0.005);
    return {
      modo: (sonIguales ? "iguales" : "montos") as Modo,
      para: ids,
      montos: Object.fromEntries(gasto.partes.map((p) => [p.userId, aTexto(p.monto)])),
    };
  })();

  const [monto, setMonto] = useState(gasto ? aTexto(gasto.monto) : "");
  const [moneda, setMoneda] = useState<Moneda>(gasto?.moneda ?? "UYU");
  const [descripcion, setDescripcion] = useState(gasto?.descripcion ?? "");
  const [fecha, setFecha] = useState(gasto ? gasto.fecha.slice(0, 10) : hoyLocal());
  // Lo que se cree desde acá ("+ Nueva") se suma a lo que vino de la página,
  // así se puede elegir enseguida sin esperar a que la página se recargue.
  const [creadasCategorias, setCreadasCategorias] = useState<Category[]>([]);
  const [creadasSecciones, setCreadasSecciones] = useState<SeccionEnFormulario[]>([]);
  const listaCategorias = [...categorias, ...creadasCategorias.filter((c) => !categorias.some((x) => x.id === c.id))];
  const listaSecciones = [...secciones, ...creadasSecciones.filter((c) => !secciones.some((x) => x.id === c.id))];
  /** El editor abierto encima del formulario, si se está creando algo. */
  const [creando, setCreando] = useState<"categoria" | "seccion" | null>(null);

  const [seccionId, setSeccionId] = useState<string | null>(gasto ? gasto.seccionId : seccionInicial);
  const [categoriaId, setCategoriaId] = useState(
    gasto?.miCategoriaId && categorias.some((c) => c.id === gasto.miCategoriaId)
      ? gasto.miCategoriaId
      : (categorias[0]?.id ?? "")
  );
  const categoriaElegida = listaCategorias.find((c) => c.id === categoriaId) ?? null;
  const [pagadorId, setPagadorId] = useState(gasto?.pagadorId ?? yo);
  /** A quiénes les toca una parte, en el orden de la lista. */
  const [para, setPara] = useState<string[]>(inicial.para);
  const [modo, setModo] = useState<Modo>(inicial.modo);
  const [pesos, setPesos] = useState<Record<string, number>>({});
  const [montos, setMontos] = useState<Record<string, string>>(inicial.montos);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const montoNumerico = parseMoneyInput(monto);
  const hayMonto = Number.isFinite(montoNumerico) && montoNumerico > 0;
  const incluidos = personas.filter((p) => para.includes(p.id)).map((p) => p.id);
  const nombre = (id: string) => (id === yo ? "Vos" : (personas.find((p) => p.id === id)?.nombre ?? "Alguien"));

  // Lo que le toca a cada uno según el modo, para mostrarlo al lado de cada
  // nombre antes de guardar.
  const pesoDe = (id: string) => pesos[id] ?? 1;
  const calculadas: Map<string, number> | null = !hayMonto || incluidos.length === 0
    ? null
    : modo === "iguales"
      ? repartirEnPartesIguales(montoNumerico, incluidos, pagadorId)
      : modo === "partes"
        ? repartirPorPartes(montoNumerico, new Map(incluidos.map((id) => [id, pesoDe(id)])), pagadorId)
        : null;
  const sumaAMano = incluidos.reduce((suma, id) => {
    const n = parseMoneyInput(montos[id] ?? "");
    return suma + (Number.isFinite(n) ? n : 0);
  }, 0);
  const falta = Math.round(((hayMonto ? montoNumerico : 0) - sumaAMano) * 100) / 100;

  /** La cuenta en una frase, debajo de la lista. */
  function resumen() {
    if (incluidos.length === 0) return "Elegí al menos una persona.";
    if (incluidos.length === 1) {
      return incluidos[0] === yo ? "Todo para vos." : `Todo para ${nombre(incluidos[0])}.`;
    }
    if (modo === "iguales") {
      const cadaUno = calculadas && Math.min(...calculadas.values());
      return cadaUno !== null && cadaUno !== undefined
        ? `Entre ${incluidos.length}: ${formatMoney(cadaUno, moneda)} cada uno.`
        : `Entre ${incluidos.length}, en partes iguales.`;
    }
    if (modo === "partes") {
      const total = incluidos.reduce((s, id) => s + pesoDe(id), 0);
      return `${total} ${total === 1 ? "parte" : "partes"} entre ${incluidos.length}.`;
    }
    if (!hayMonto) return "Escribí cuánto le toca a cada uno.";
    if (Math.abs(falta) < 0.005) return "Las partes suman el total.";
    return falta > 0
      ? `Faltan ${formatMoney(falta, moneda)} para llegar al total.`
      : `Te pasaste por ${formatMoney(-falta, moneda)}.`;
  }

  function alternar(id: string) {
    setPara((actual) => (actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id]));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (ocupado) return;
    setError(null);

    if (!hayMonto) {
      setError("Escribí un monto mayor que cero.");
      enfocarCampoConError("monto-grupo");
      return;
    }

    // El reparto viaja como "iguales" o como el monto de cada uno; por partes
    // se calcula acá y el servidor solo comprueba que sume el total.
    let reparto:
      | { modo: "iguales"; personas: string[] }
      | { modo: "montos"; partes: { userId: string; monto: number }[] }
      | undefined;
    if (compartido) {
      if (incluidos.length === 0) {
        setError("Elegí para quién es el gasto.");
        return;
      }
      if (modo === "iguales") {
        reparto = { modo: "iguales", personas: incluidos };
      } else if (modo === "partes") {
        if (!calculadas || calculadas.size === 0) {
          setError("Alguien tiene que tener al menos una parte.");
          return;
        }
        reparto = { modo: "montos", partes: [...calculadas].map(([userId, parte]) => ({ userId, monto: parte })) };
      } else {
        if (Math.abs(falta) >= 0.005) {
          setError("Las partes tienen que sumar el total del gasto.");
          return;
        }
        reparto = {
          modo: "montos",
          partes: incluidos.map((id) => ({ userId: id, monto: parseMoneyInput(montos[id] ?? "") || 0 })),
        };
      }
    }

    setOcupado(true);
    try {
      const res = await fetch(
        gasto ? `/api/grupos/${grupo.id}/gastos/${gasto.id}` : `/api/grupos/${grupo.id}/gastos`,
        {
          method: gasto ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            monto: montoNumerico,
            moneda,
            fecha: new Date(fecha).toISOString(),
            descripcion: descripcion || undefined,
            seccionId,
            categoryId: categoriaId,
            pagadorId: compartido ? pagadorId : yo,
            reparto,
          }),
        }
      );
      const datos = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(datos.error ?? (gasto ? "No se pudo guardar el gasto." : "No se pudo cargar el gasto."));
        return;
      }
      alGuardar(
        gasto
          ? `Gasto de ${formatMoney(montoNumerico, moneda)} guardado.`
          : `Gasto de ${formatMoney(montoNumerico, moneda)} cargado.`
      );
    } finally {
      setOcupado(false);
    }
  }

  const fichaElegida = {
    borderColor: "var(--grupo)",
    backgroundColor: "color-mix(in srgb, var(--grupo) 14%, transparent)",
    color: "var(--texto)",
  };

  return (
    <>
      <dialog
        ref={dialogo}
        className="dialogo hoja"
        aria-labelledby="formulario-gasto-titulo"
        onCancel={(e) => {
          e.preventDefault();
          alCerrar();
        }}
      >
        <form id="formulario-gasto" onSubmit={guardar} className="flex max-h-[inherit] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-borde px-5 py-4">
            <h2 id="formulario-gasto-titulo" className="seccion-titulo">
              {gasto ? "Editar gasto" : "Nuevo gasto"}
            </h2>
            <button type="button" onClick={alCerrar} aria-label="Cerrar" className="boton-mini -mr-2">
              <span aria-hidden>✕</span>
            </button>
          </div>

          <div className="flex flex-col gap-6 overflow-y-auto px-5 py-5">
            <CampoMonto
              id="monto-grupo"
              idError={error ? "error-gasto-grupo" : undefined}
              monto={monto}
              alCambiarMonto={setMonto}
              moneda={moneda}
              alCambiarMoneda={setMoneda}
              nombreGrupo="moneda-gasto-grupo"
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="descripcion-grupo" className="rotulo">¿En qué fue?</label>
              <input
                id="descripcion-grupo"
                type="text"
                placeholder="Ej: Supermercado, nafta, la cena"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                maxLength={200}
                className="campo"
              />
            </div>

            {/* ---- qué fue: la sección del grupo y tu categoría ---- */}
            {(listaSecciones.length > 0 || puedeCrearSecciones) && (
              <fieldset className="min-w-0">
                <legend className="rotulo mb-2">Sección</legend>
                <div className="flex flex-wrap gap-1.5">
                  {[{ id: "", nombre: "Sin sección", emoji: null }, ...listaSecciones].map((seccion) => {
                    const activa = seccion.id === (seccionId ?? "");
                    return (
                      <label key={seccion.id || "ninguna"} className="ficha">
                        <input
                          type="radio"
                          name="seccion-gasto-grupo"
                          checked={activa}
                          onChange={() => setSeccionId(seccion.id || null)}
                          className="sr-only"
                        />
                        <span style={activa ? fichaElegida : undefined}>
                          {seccion.emoji && <span aria-hidden>{seccion.emoji}</span>}
                          {seccion.nombre}
                        </span>
                      </label>
                    );
                  })}
                  {puedeCrearSecciones && (
                    <button
                      type="button"
                      onClick={() => setCreando("seccion")}
                      aria-haspopup="dialog"
                      className="ficha-nueva"
                    >
                      + Nueva
                    </button>
                  )}
                </div>
              </fieldset>
            )}

            <div className="flex flex-col gap-2">
              {/* Un menú desplegable y no fichas: con muchas categorías, las
                  fichas ocupaban media pantalla. Si la que buscás no está, se
                  crea con "+ Nueva". */}
              <label htmlFor="categoria-gasto-grupo" className="rotulo">
                {compartido ? "Tu categoría" : "Categoría"}
              </label>
              <div className="flex items-center gap-2">
                {categoriaElegida && (
                  <Insignia
                    nombre={categoriaElegida.name}
                    color={categoriaElegida.color}
                    emoji={categoriaElegida.emoji}
                    chica
                  />
                )}
                {listaCategorias.length > 0 && (
                  <select
                    id="categoria-gasto-grupo"
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    className="campo min-w-0 flex-1"
                  >
                    {listaCategorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji ? `${c.emoji}  ${c.name}` : c.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => setCreando("categoria")}
                  aria-haspopup="dialog"
                  className="ficha-nueva shrink-0"
                >
                  + Nueva
                </button>
              </div>
              {compartido && (
                <p className="text-xs text-tenue">
                  Es para tu parte. Las de los demás caen en su categoría «Gastos grupales».
                </p>
              )}
            </div>

            {compartido && (
              <>
                {/* ---- quién pagó ---- */}
                <fieldset className="min-w-0">
                  <legend className="rotulo mb-2">Pagó</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {personas.map((p) => {
                      const activo = p.id === pagadorId;
                      return (
                        <label key={p.id} className="ficha">
                          <input
                            type="radio"
                            name="pagador-gasto-grupo"
                            checked={activo}
                            onChange={() => setPagadorId(p.id)}
                            className="sr-only"
                          />
                          <span style={activo ? fichaElegida : undefined}>
                            <Inicial nombre={p.nombre} activo={activo} />
                            {nombre(p.id)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                {/* ---- para quién ---- */}
                {/* min-w-0: un fieldset no se achica por debajo de su contenido
                    y la lista empujaba todo el formulario hacia la derecha. */}
                <fieldset className="flex min-w-0 flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <legend className="rotulo">Para quién</legend>
                    <span className="-mr-2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => setPara(personas.map((p) => p.id))}
                        className="boton-mini"
                        aria-pressed={incluidos.length === personas.length}
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => setPara([yo])}
                        className="boton-mini"
                        aria-pressed={incluidos.length === 1 && incluidos[0] === yo}
                      >
                        Solo yo
                      </button>
                    </span>
                  </div>

                  {/* Cómo se divide, arriba de la lista y siempre en el mismo
                      lugar: antes compartía renglón con la frase de abajo y,
                      según lo largo de la frase, bajaba de renglón y hacía
                      saltar todo el formulario. Con una sola persona elegida
                      sigue visible, aunque no cambie nada, para que tildar o
                      destildar no lo haga aparecer y desaparecer. */}
                  {/* A lo ancho, con las tres opciones del mismo tamaño. */}
                  <div className="[&_.segmento]:flex-1 [&_.segmento>span]:text-center [&_.segmentos]:w-full">
                  <Conmutador<Modo>
                    nombreGrupo="modo-reparto"
                    etiqueta="Cómo se divide"
                    opciones={[
                      { valor: "iguales", texto: "Iguales" },
                      { valor: "partes", texto: "Por partes" },
                      { valor: "montos", texto: "Montos" },
                    ]}
                    valor={modo}
                    alCambiar={setModo}
                  />
                  </div>

                  <ul className="lista">
                    {personas.map((p) => {
                      const incluida = incluidos.includes(p.id);
                      return (
                        <li key={p.id} className="flex min-h-14 items-center gap-3 px-3 py-2">
                          {/* La fila entera suma o saca a la persona. */}
                          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                            <input
                              type="checkbox"
                              checked={incluida}
                              onChange={() => alternar(p.id)}
                              className="sr-only"
                            />
                            <span
                              aria-hidden
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
                                incluida ? "border-transparent bg-foco text-fondo" : "border-borde-fuerte"
                              }`}
                            >
                              {incluida && (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                  <path d="M5 12.5 10 17.5 19 7" />
                                </svg>
                              )}
                            </span>
                            <Inicial nombre={p.nombre} activo={incluida} />
                            <span className="flex min-w-0 flex-col">
                              <span className={`truncate text-[15px] ${incluida ? "text-texto" : "text-tenue"}`}>
                                {nombre(p.id)}
                              </span>
                              {/* Por partes, el monto va debajo del nombre: al
                                  lado del contador no entra en un celular. */}
                              {incluida && modo === "partes" && calculadas?.has(p.id) && (
                                <span className="monto text-xs text-suave">
                                  {formatMoney(calculadas.get(p.id)!, moneda)}
                                </span>
                              )}
                            </span>
                          </label>

                          {modo === "partes" && incluida ? null : incluida && modo === "montos" ? (
                            <input
                              inputMode="decimal"
                              placeholder="0"
                              aria-label={`Parte de ${nombre(p.id)}`}
                              value={montos[p.id] ?? ""}
                              onChange={(e) => setMontos({ ...montos, [p.id]: formatMoneyInput(e.target.value) })}
                              className="campo monto w-28 shrink-0 py-1.5 text-right"
                            />
                          ) : (
                            <span className={`monto shrink-0 text-sm ${incluida ? "text-texto" : "text-tenue"}`}>
                              {incluida && calculadas?.has(p.id) ? formatMoney(calculadas.get(p.id)!, moneda) : "—"}
                            </span>
                          )}

                          {incluida && modo === "partes" && (
                            <ContadorDePartes
                              nombre={nombre(p.id)}
                              valor={pesoDe(p.id)}
                              alCambiar={(n) => {
                                // Bajar a 0 es sacarla del gasto.
                                if (n === 0) alternar(p.id);
                                else setPesos({ ...pesos, [p.id]: n });
                              }}
                            />
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {/* La frase va sola en su renglón y con el alto reservado: un
                      texto más largo ("Faltan $ … para llegar al total.") no
                      empuja el resto del formulario. */}
                  <p
                    className={`min-h-5 text-sm ${
                      incluidos.length === 0 || (modo === "montos" && hayMonto && Math.abs(falta) >= 0.005)
                        ? "text-alerta"
                        : "text-suave"
                    }`}
                    aria-live="polite"
                  >
                    {resumen()}
                  </p>
                </fieldset>
              </>
            )}

            <div className="flex flex-col gap-1.5 sm:max-w-[50%]">
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

            {listaCategorias.length === 0 && (
              <p className="text-sm text-suave">
                Necesitás al menos una categoría para cargar un gasto: creá una con «+ Nueva».
              </p>
            )}

            {error && <Aviso id="error-gasto-grupo" tono="error">{error}</Aviso>}
          </div>

          <div className="flex items-center gap-3 border-t border-borde px-5 py-4">
            <p className="min-w-0 flex-1 text-xs text-tenue">
              {compartido
                ? "Cada uno ve su parte en su mes, marcada como del grupo."
                : "También cuenta en tu mes, marcado como del grupo."}
            </p>
            <button type="submit" disabled={ocupado || listaCategorias.length === 0} className="boton shrink-0">
              {ocupado ? (gasto ? "Guardando..." : "Cargando...") : gasto ? "Guardar cambios" : "Cargar gasto"}
            </button>
          </div>
        </form>
      </dialog>

      {/* Los editores van al lado del formulario y no adentro (un formulario no
          puede contener otro); igual se abren encima, porque los diálogos se
          apilan. */}
      {creando === "categoria" && (
        <NuevaCategoria
          alCerrar={() => setCreando(null)}
          alCrear={(categoria) => {
            setCreadasCategorias((actuales) => [...actuales, categoria]);
            setCategoriaId(categoria.id);
            setCreando(null);
            alCrear();
          }}
        />
      )}
      {creando === "seccion" && (
        <EditorSeccion
          grupoId={grupo.id}
          colorDelGrupo={colorDelGrupo}
          seccion={null}
          alCerrar={() => setCreando(null)}
          alGuardar={(_aviso, seccion) => {
            setCreadasSecciones((actuales) => [...actuales, seccion]);
            setSeccionId(seccion.id);
            setCreando(null);
            alCrear();
          }}
        />
      )}
    </>
  );
}

/** La inicial de una persona en un círculo, como en la lista de personas. */
function Inicial({ nombre, activo }: { nombre: string; activo: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
        activo ? "bg-superficie-alta text-texto" : "bg-superficie-alta/60 text-tenue"
      }`}
    >
      {nombre.trim().charAt(0).toUpperCase() || "·"}
    </span>
  );
}

/** − n +: cuántas partes le tocan a una persona. */
function ContadorDePartes({
  nombre,
  valor,
  alCambiar,
}: {
  nombre: string;
  valor: number;
  alCambiar: (n: number) => void;
}) {
  const boton =
    "flex h-8 w-8 items-center justify-center rounded-full border border-borde text-suave transition-colors hover:border-borde-fuerte hover:text-texto disabled:opacity-35";
  return (
    <span className="flex shrink-0 items-center gap-1" role="group" aria-label={`Partes de ${nombre}`}>
      <button type="button" onClick={() => alCambiar(valor - 1)} aria-label={`Una parte menos para ${nombre}`} className={boton}>
        <span aria-hidden>−</span>
      </button>
      <span className="monto w-6 text-center text-sm font-semibold text-texto" aria-live="polite">
        ×{valor}
      </span>
      <button
        type="button"
        onClick={() => alCambiar(valor + 1)}
        disabled={valor >= MAXIMO_PARTES}
        aria-label={`Una parte más para ${nombre}`}
        className={boton}
      >
        <span aria-hidden>+</span>
      </button>
    </span>
  );
}
