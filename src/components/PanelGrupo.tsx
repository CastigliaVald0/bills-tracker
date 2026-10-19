"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/lib/types";
import { Aviso, useAvisoTemporal } from "@/components/Aviso";
import { Confirmar } from "@/components/Confirmar";
import { DetalleGasto } from "@/components/DetalleGasto";
import { FormularioGastoGrupal } from "@/components/FormularioGastoGrupal";
import { EditorSeccion, type SeccionEditable } from "@/components/EditorSeccion";
import { formatMoney } from "@/lib/format";
import { trazarMosaico } from "@/lib/mosaico";
import estilos from "./PanelGrupo.module.css";

type Seccion = { id: string; nombre: string; color: string | null; emoji: string | null };
type GastoDeGrupo = {
  id: string;
  monto: number;
  moneda: "UYU" | "USD";
  fecha: string;
  descripcion: string | null;
  seccionId: string | null;
  pagadorId: string;
  cargadoPorId: string;
  /** Cuántas personas se reparten el gasto. */
  personasEnReparto: number;
  /** Lo que me toca a mí, o null si no participo. */
  miParte: number | null;
  /** Lo que le toca a cada uno: el detalle del gasto y la planilla. */
  partes: { userId: string; monto: number }[];
  /** La categoría de mi parte, para editar el gasto sin moverla. */
  miCategoriaId: string | null;
  /** El monto llevado a pesos. Solo dimensiona el mosaico; nunca se muestra. */
  enPesos: number;
};

/** Cómo se nombra, en el filtro, lo que no tiene sección. */
const SIN_SECCION = "__sin__";

type Resumen = {
  id: string;
  nombre: string;
  /** El color propio de la sección; null usa el del grupo. */
  color: string | null;
  emoji: string | null;
  UYU: number;
  USD: number;
  cantidad: number;
  enPesos: number;
};

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
  yo,
  esAdmin,
  personas,
  secciones,
  categorias,
  gastos,
  miSaldo,
  pagos,
  saldos,
  personasDelGrupo,
}: {
  grupo: { id: string; nombre: string; color: string; archivado: boolean; usaSecciones: boolean };
  yo: string;
  /** Quien creó el grupo: maneja secciones, personas y el cierre. */
  esAdmin: boolean;
  /** Todos los que participan, para elegir quién pagó y el reparto. */
  personas: { id: string; nombre: string }[];
  secciones: Seccion[];
  categorias: Category[];
  gastos: GastoDeGrupo[];
  /** Mi saldo en el grupo por moneda (positivo: me deben). Null si no es compartido. */
  miSaldo: { UYU: number; USD: number } | null;
  /** Los pagos entre personas, para la planilla. */
  pagos: { deId: string; aId: string; monto: number; moneda: "UYU" | "USD"; fecha: string }[];
  /** El contenido de la pestaña Saldos; no viene si el grupo no es compartido. */
  saldos?: React.ReactNode;
  /** Las personas del grupo, para la pestaña Grupo. */
  personasDelGrupo?: React.ReactNode;
}) {
  const router = useRouter();
  const [aviso, mostrarAviso] = useAvisoTemporal();
  const [ocupado, setOcupado] = useState(false);

  /** La sección elegida en el mosaico. Null = todo el grupo. */
  const [elegido, setElegido] = useState<string | null>(null);
  /** El formulario abierto: para un gasto nuevo (gasto null) o para editar uno. */
  const [formulario, setFormulario] = useState<{
    gasto: GastoDeGrupo | null;
    /** La caja del botón que lo abrió: el formulario se expande desde ahí. */
    origen?: { x: number; y: number; ancho: number; alto: number };
  } | null>(null);
  const compartido = personas.length > 1;

  /** El editor de secciones abierto: para una nueva (seccion null) o para editar una. */
  const [editorSeccion, setEditorSeccion] = useState<{ seccion: SeccionEditable | null } | null>(null);
  /** El gasto abierto en el detalle. */
  const [detalle, setDetalle] = useState<GastoDeGrupo | null>(null);
  /** La pestaña abierta: los gastos, las cuentas entre personas o el grupo. */
  const [pestana, setPestana] = useState<"gastos" | "saldos" | "grupo">("gastos");
  const [confirmar, setConfirmar] = useState<
    | { que: "gasto"; gasto: GastoDeGrupo }
    | { que: "seccion"; seccion: { id: string; nombre: string } }
    | { que: "grupo" }
    | null
  >(null);

  // Cada sección con lo suyo, más lo que quedó sin sección si hay algo.
  const resumenes = useMemo(() => {
    const mapa = new Map<string, Resumen>(
      secciones.map((s) => [
        s.id,
        { id: s.id, nombre: s.nombre, color: s.color, emoji: s.emoji, UYU: 0, USD: 0, cantidad: 0, enPesos: 0 },
      ])
    );
    for (const gasto of gastos) {
      const clave = gasto.seccionId && mapa.has(gasto.seccionId) ? gasto.seccionId : SIN_SECCION;
      const resumen =
        mapa.get(clave) ??
        { id: SIN_SECCION, nombre: "Sin sección", color: null, emoji: null, UYU: 0, USD: 0, cantidad: 0, enPesos: 0 };
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

  // Mi total y el total de lo que se está viendo (todo el grupo o una sección).
  const misTotales = { UYU: 0, USD: 0 };
  const totalesVisibles = { UYU: 0, USD: 0 };
  for (const gasto of visibles) {
    totalesVisibles[gasto.moneda] += gasto.monto;
    misTotales[gasto.moneda] += gasto.miParte ?? 0;
  }

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
  /** El nombre con su emoji delante, para mostrar (la planilla usa solo el nombre). */
  const etiquetaDeSeccion = (id: string | null) => {
    const seccion = secciones.find((s) => s.id === id);
    return seccion ? `${seccion.emoji ? `${seccion.emoji} ` : ""}${seccion.nombre}` : null;
  };
  const nombreDe = (id: string) => personas.find((p) => p.id === id)?.nombre ?? "alguien";

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

  /**
   * Descarga la planilla del grupo: un gasto por fila con la parte de cada
   * persona en su columna, y abajo los pagos entre personas. Es un CSV
   * separado por punto y coma, con coma decimal y la marca UTF-8 al
   * principio: así Excel en español lo abre directo, con tildes y en columnas.
   */
  function exportarPlanilla() {
    const celda = (valor: string | number | null) => {
      const texto = valor === null ? "" : typeof valor === "number" ? valor.toFixed(2).replace(".", ",") : valor;
      return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
    };
    const fechaCorta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
    const fila = (valores: (string | number | null)[]) => valores.map(celda).join(";");

    const lineas = [
      fila(["Fecha", "Descripción", "Sección", "Pagó", "Moneda", "Monto", ...personas.map((p) => `Parte de ${p.nombre}`)]),
      ...[...gastos]
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .map((g) =>
          fila([
            fechaCorta(g.fecha),
            g.descripcion || "Gasto",
            nombreDeSeccion(g.seccionId) ?? "",
            nombreDe(g.pagadorId),
            g.moneda,
            g.monto,
            ...personas.map((p) => g.partes.find((x) => x.userId === p.id)?.monto ?? null),
          ])
        ),
    ];
    if (pagos.length > 0) {
      lineas.push("", fila(["Pagos entre personas"]), fila(["Fecha", "De", "A", "Moneda", "Monto"]));
      for (const pago of [...pagos].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
        lineas.push(fila([fechaCorta(pago.fecha), nombreDe(pago.deId), nombreDe(pago.aId), pago.moneda, pago.monto]));
      }
    }

    const archivo = new Blob(["\uFEFF" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(archivo);
    enlace.download = `${grupo.nombre.replace(/[\\/:*?"<>|]/g, "").trim() || "grupo"} - gastos.csv`;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

  async function ejecutarConfirmado() {
    const pedido = confirmar;
    setConfirmar(null);
    if (!pedido) return;

    if (pedido.que === "gasto") {
      const res = await pedir(`/api/grupos/${grupo.id}/gastos/${pedido.gasto.id}`, "DELETE");
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
                    // la sección con color propio pinta su filete y su borde de elegida
                    ...(dato.color ? { "--grupo": dato.color } : {}),
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

                  <span className={estilos.seccionNombre}>
                    {dato.emoji && <span aria-hidden className="mr-1.5">{dato.emoji}</span>}
                    {dato.nombre}
                  </span>

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
              <p className="truncate text-sm font-medium text-texto">
                {elegida.dato.emoji && `${elegida.dato.emoji} `}
                {elegida.dato.nombre}
              </p>
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
              {esAdmin && !grupo.archivado && elegida.dato.id !== SIN_SECCION && (
                <button
                  type="button"
                  onClick={() =>
                    setEditorSeccion({
                      seccion: {
                        id: elegida.dato.id,
                        nombre: elegida.dato.nombre,
                        color: elegida.dato.color,
                        emoji: elegida.dato.emoji,
                      },
                    })
                  }
                  aria-haspopup="dialog"
                  className={estilos.accionSeccion}
                >
                  Editar
                </button>
              )}
              {esAdmin && !grupo.archivado && elegida.dato.id !== SIN_SECCION && (
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

  const puedeEditar = esAdmin && !grupo.archivado;

  /** Una fila de "Ajustes del grupo": ícono, qué hace y el botón. */
  function filaDeAjuste(icono: React.ReactNode, titulo: string, detalle: string, boton: React.ReactNode) {
    return (
      <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-superficie-alta text-suave"
        >
          {icono}
        </span>
        <div className="min-w-0 flex-1 basis-48">
          <p className="text-sm font-medium text-texto">{titulo}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-tenue">{detalle}</p>
        </div>
        {boton}
      </li>
    );
  }

  /** "$ 12.800,00 y US$ 190,00": los montos de una lista, sin mezclar monedas. */
  const enMonedas = (montos: { monto: number; moneda: "UYU" | "USD" }[]) =>
    montos.map((m) => formatMoney(m.monto, m.moneda)).join(" y ");

  // Mi situación en una frase, como abren su página de grupo las apps de
  // gastos compartidos: lo que me deben y lo que debo, cada moneda aparte.
  const aFavor = miSaldo
    ? (["UYU", "USD"] as const)
        .filter((m) => miSaldo[m] >= 0.005)
        .map((m) => ({ monto: miSaldo[m], moneda: m }))
    : [];
  const enContra = miSaldo
    ? (["UYU", "USD"] as const)
        .filter((m) => miSaldo[m] <= -0.005)
        .map((m) => ({ monto: -miSaldo[m], moneda: m }))
    : [];

  const pestanas = [
    { id: "gastos" as const, texto: "Gastos", cuenta: gastos.length },
    ...(saldos ? [{ id: "saldos" as const, texto: "Saldos", cuenta: null }] : []),
    { id: "grupo" as const, texto: "Grupo", cuenta: personas.length > 1 ? personas.length : null },
  ];

  /**
   * Lo que un gasto significa para mí, que es lo que va a la derecha de cada
   * fila (como en Splitwise): si pagué yo, cuánto me deben los demás; si pagó
   * otro, cuánto le debo. El total del gasto queda en la línea de abajo.
   */
  function efectoParaMi(gasto: GastoDeGrupo) {
    if (gasto.pagadorId === yo) {
      const prestado = gasto.monto - (gasto.miParte ?? 0);
      return prestado >= 0.005
        ? { texto: "Te deben", monto: prestado }
        : { texto: "Tu gasto", monto: gasto.monto };
    }
    if (gasto.miParte === null) return { texto: "No participás", monto: null };
    return { texto: "Debés", monto: gasto.miParte };
  }

  return (
    <div className={estilos.sala} style={{ "--grupo": grupo.color } as React.CSSProperties}>
      {/* ---------------------------------------------------------------- */}
      {/* Mi situación y la acción principal, pegadas a la pizarra. */}
      {(miSaldo || !grupo.archivado) && (
        <div className="-mt-2 flex flex-col gap-3">
          {miSaldo && (
            <div className="tarjeta flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3.5">
              <div className="min-w-0">
                {aFavor.length === 0 && enContra.length === 0 ? (
                  <p className="text-[15px] font-medium text-texto">Estás al día con el grupo</p>
                ) : (
                  <>
                    {aFavor.length > 0 && (
                      <p className="text-sm text-suave">
                        Te deben <span className="monto text-[15px] font-semibold text-texto">{enMonedas(aFavor)}</span>
                      </p>
                    )}
                    {enContra.length > 0 && (
                      <p className="text-sm text-suave">
                        Debés <span className="monto text-[15px] font-semibold text-texto">{enMonedas(enContra)}</span>
                      </p>
                    )}
                  </>
                )}
              </div>
              {saldos && pestana !== "saldos" && (
                <button type="button" onClick={() => setPestana("saldos")} className="boton-mini -mx-2.5">
                  Ver saldos <span aria-hidden>→</span>
                </button>
              )}
            </div>
          )}

          {!grupo.archivado && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <button
                type="button"
                onClick={(e) => {
                  const caja = e.currentTarget.getBoundingClientRect();
                  setFormulario({
                    gasto: null,
                    origen: {
                      x: caja.left + caja.width / 2,
                      y: caja.top + caja.height / 2,
                      ancho: caja.width,
                      alto: caja.height,
                    },
                  });
                }}
                aria-haspopup="dialog"
                className="boton w-full py-2.5 sm:w-auto"
              >
                <span aria-hidden className="text-base leading-none">+</span>
                Cargar gasto
                {seccionDelGasto && ` en ${nombreDeSeccion(seccionDelGasto)}`}
              </button>
              {aviso && <Aviso tono="ok">{aviso}</Aviso>}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Las pestañas: lo que se mira por separado no comparte pantalla. */}
      <div>
        <div role="tablist" aria-label="Partes del grupo" className="pestanas">
          {pestanas.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              id={`pestana-${p.id}`}
              aria-selected={pestana === p.id}
              aria-controls={`panel-${p.id}`}
              onClick={() => setPestana(p.id)}
              className="pestana"
            >
              {p.texto}
              {p.cuenta !== null && <span className="pestana-cuenta">{p.cuenta}</span>}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`panel-${pestana}`}
          aria-labelledby={`pestana-${pestana}`}
          // `key`: al cambiar de pestaña el contenido entra de nuevo, suave.
          key={pestana}
          className="aparece flex flex-col gap-8 pt-6"
        >
          {pestana === "gastos" && (
            <>
              {grupo.usaSecciones && (
                <section aria-labelledby="titulo-secciones">
                  <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
                    <h2 id="titulo-secciones" className="seccion-titulo">Secciones</h2>
                    {puedeEditar && (
                      <button
                        type="button"
                        onClick={() => setEditorSeccion({ seccion: null })}
                        aria-haspopup="dialog"
                        className="boton-mini"
                      >
                        + Nueva sección
                      </button>
                    )}
                  </div>

                  {/* El mosaico solo con secciones de verdad: sin ninguna, los
                      gastos se veían como una única pieza "Sin sección". */}
                  {secciones.length === 0 ? (
                    <div className="rounded-[var(--radio-tarjeta)] border border-dashed border-borde-fuerte px-6 py-8 text-center">
                      <p className="text-sm font-medium text-texto">Este grupo todavía no tiene secciones</p>
                      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-suave">
                        Sirven para ver cuánto se fue en cada parte.
                        {puedeEditar && " Agregá la primera con «+ Nueva sección»."}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* El margen negativo compensa el aire de cada pieza, para que
                          el mosaico quede alineado con el resto de la página. */}
                      <div className="-m-[3px]">
                        {dibujarMosaico(2.3, "hidden sm:block")}
                        {dibujarMosaico(1, "sm:hidden")}
                      </div>
                      <p className="mt-2.5 px-1 text-xs text-tenue">
                        Cada sección ocupa lo que se gastó en ella. Tocá una para ver solo sus gastos.
                      </p>
                    </>
                  )}

                </section>
              )}

              <section aria-labelledby="titulo-movimientos">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 px-1">
                  <h2 id="titulo-movimientos" className="seccion-titulo">
                    {resumenElegido ? resumenElegido.nombre : "Todos los gastos"}
                  </h2>
                  <span className="-mr-2 flex items-center gap-1">
                    {resumenElegido && (
                      <button type="button" onClick={() => setElegido(null)} className="boton-mini">
                        Ver todos
                      </button>
                    )}
                    {gastos.length > 0 && (
                      <button type="button" onClick={exportarPlanilla} className="boton-mini">
                        Exportar a Excel
                      </button>
                    )}
                  </span>
                </div>

                {/* Mi total contra el de la sección elegida, como la barra de
                    abajo de Tricount. */}
                {/* Con todo el grupo a la vista, lo tuyo y lo general ya están en
                    la pizarra; acá solo hace falta con una sección elegida. */}
                {compartido && resumenElegido && visibles.length > 0 && (
                  <dl className="mb-4 grid grid-cols-2 gap-3">
                    {[
                      { titulo: "Tu parte", montos: misTotales },
                      { titulo: "Total de la sección", montos: totalesVisibles },
                    ].map((bloque) => (
                      <div key={bloque.titulo} className="rounded-2xl bg-superficie px-4 py-3 ring-1 ring-borde">
                        <dt className="text-xs text-tenue">{bloque.titulo}</dt>
                        <dd className="mt-1 flex flex-col">
                          {bloque.montos.UYU === 0 && bloque.montos.USD === 0 ? (
                            <span className="monto text-[15px] font-semibold text-texto">{formatMoney(0, "UYU")}</span>
                          ) : (
                            <>
                              {bloque.montos.UYU > 0 && (
                                <span className="monto text-[15px] font-semibold text-peso">
                                  {formatMoney(bloque.montos.UYU, "UYU")}
                                </span>
                              )}
                              {bloque.montos.USD > 0 && (
                                <span className="monto text-[15px] font-semibold text-dolar">
                                  {formatMoney(bloque.montos.USD, "USD")}
                                </span>
                              )}
                            </>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                {visibles.length === 0 ? (
                  <p className="rounded-[var(--radio-tarjeta)] border border-dashed border-borde-fuerte px-6 py-8 text-center text-sm leading-relaxed text-suave">
                    {resumenElegido
                      ? `Todavía no hay gastos en ${resumenElegido.nombre}.`
                      : grupo.archivado
                        ? "Este grupo no llegó a tener gastos."
                        : "Todavía no hay gastos. El primero que cargues aparece acá."}
                  </p>
                ) : (
                  <div className="flex flex-col gap-5">
                    {meses.map((mes) => (
                      <div key={mes.clave} className="tarjeta overflow-hidden">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 bg-fondo/35 px-4 py-2.5">
                          <h3 className={`${estilos.mes} text-sm font-semibold text-texto`}>
                            <span className="inline-block first-letter:uppercase">{nombreDelMes(mes.clave)}</span>
                          </h3>
                          <p className="monto flex gap-3 text-xs text-suave">
                            {mes.UYU > 0 && <span>{formatMoney(mes.UYU, "UYU")}</span>}
                            {mes.USD > 0 && <span className="text-dolar">{formatMoney(mes.USD, "USD")}</span>}
                          </p>
                        </div>

                        <ul className="lista rounded-none border-0 bg-transparent shadow-none">
                          {mes.gastos.map((gasto) => {
                            const seccion = nombreDeSeccion(gasto.seccionId);
                            const efecto = compartido ? efectoParaMi(gasto) : null;
                            return (
                              <li key={gasto.id}>
                                {/* Toda la fila abre el detalle, donde se edita
                                    o se borra, como en Tricount. */}
                                <button
                                  type="button"
                                  onClick={() => setDetalle(gasto)}
                                  aria-haspopup="dialog"
                                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-superficie-alta/60"
                                >
                                {/* el día, como la hoja de un almanaque */}
                                <span className="monto flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-fondo/70 ring-1 ring-borde">
                                  <span className="text-[15px] font-semibold leading-none text-texto">
                                    {Number(gasto.fecha.slice(8, 10))}
                                  </span>
                                </span>

                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[15px] font-medium text-texto">
                                    {gasto.descripcion || "Gasto"}
                                  </p>
                                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-tenue">
                                    {seccion && !resumenElegido && (
                                      <span className={`${estilos.etiqueta} mr-0.5`}>{etiquetaDeSeccion(gasto.seccionId)}</span>
                                    )}
                                    {compartido ? (
                                      <span>
                                        {gasto.pagadorId === yo ? "Pagaste" : `Pagó ${nombreDe(gasto.pagadorId)}`}{" "}
                                        <span className={`monto ${gasto.moneda === "USD" ? "text-dolar" : ""}`}>
                                          {formatMoney(gasto.monto, gasto.moneda)}
                                        </span>
                                      </span>
                                    ) : null}
                                  </p>
                                </div>

                                <div className="flex shrink-0 flex-col items-end text-right">
                                  {efecto ? (
                                    <>
                                      <span className="text-[11px] text-tenue">{efecto.texto}</span>
                                      {efecto.monto !== null && (
                                        <span
                                          className={`monto text-[15px] font-semibold ${
                                            gasto.moneda === "UYU" ? "text-peso" : "text-dolar"
                                          }`}
                                        >
                                          {formatMoney(efecto.monto, gasto.moneda)}
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <span
                                      className={`monto text-[15px] font-semibold ${
                                        gasto.moneda === "UYU" ? "text-peso" : "text-dolar"
                                      }`}
                                    >
                                      {formatMoney(gasto.monto, gasto.moneda)}
                                    </span>
                                  )}
                                </div>

                                <span aria-hidden className="-mr-1 shrink-0 text-lg leading-none text-tenue">
                                  ›
                                </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* Los elementos que arma la página (en el servidor) van cada uno
              en su propio Fragment con key: sueltos en una lista de hijos,
              React en desarrollo los marca como "hijo sin key". */}
          {pestana === "saldos" && <Fragment key="saldos">{saldos}</Fragment>}

          {pestana === "grupo" && (
            <>
              <Fragment key="personas">{personasDelGrupo}</Fragment>
              {esAdmin && (
                <section aria-labelledby="titulo-ajustes">
                  <h2 id="titulo-ajustes" className="seccion-titulo mb-3 px-1">Ajustes del grupo</h2>
                  <ul className="lista">
                    {!grupo.usaSecciones &&
                      !grupo.archivado &&
                      filaDeAjuste(
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
                          <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
                          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
                          <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
                        </svg>,
                        "Dividir en secciones",
                        "Hoy todos los gastos van juntos. Con secciones ves cuánto se fue en cada parte.",
                        <button type="button" disabled={ocupado} onClick={usarSecciones} className="boton-linea shrink-0 py-1.5">
                          Dividir
                        </button>
                      )}
                    {filaDeAjuste(
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                        <rect x="3.5" y="4.5" width="17" height="4.5" rx="1" />
                        <path d="M5 9v9.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V9M10 13h4" />
                      </svg>,
                      grupo.archivado ? "Reabrir el grupo" : "Archivar el grupo",
                      grupo.archivado
                        ? "Vuelve a la lista principal y se le pueden cargar gastos otra vez."
                        : "Para cuando ya terminó. No admite gastos nuevos, pero queda guardado y se puede reabrir.",
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => archivar(!grupo.archivado)}
                        className="boton-linea shrink-0 py-1.5"
                      >
                        {grupo.archivado ? "Reabrir" : "Archivar"}
                      </button>
                    )}
                    {filaDeAjuste(
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                        <path d="M4.5 7h15M9.5 7V5h5v2M6.5 7l1 12.5h9l1-12.5M10 11v5.5M14 11v5.5" />
                      </svg>,
                      "Borrar el grupo",
                      `No se puede deshacer.${
                        gastos.length === 1
                          ? " Su gasto queda como un gasto común en tu mes."
                          : gastos.length > 1
                            ? ` Sus ${gastos.length} gastos quedan como gastos comunes en tus meses.`
                            : ""
                      }`,
                      <button
                        type="button"
                        onClick={() => setConfirmar({ que: "grupo" })}
                        className="boton-linea shrink-0 py-1.5 hover:border-alerta hover:text-alerta"
                      >
                        Borrar
                      </button>
                    )}
                  </ul>
                </section>
              )}
              {!personasDelGrupo && !esAdmin && (
                <p className="text-sm text-suave">Este grupo es de una sola persona.</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Se monta al abrirse, así cada vez arranca con los datos del gasto
          (o en blanco, si es nuevo). */}
      {formulario && (
        <FormularioGastoGrupal
          grupo={grupo}
          yo={yo}
          personas={personas}
          secciones={grupo.usaSecciones ? secciones : []}
          categorias={categorias}
          gasto={formulario.gasto}
          seccionInicial={seccionDelGasto}
          origen={formulario.origen ?? null}
          puedeCrearSecciones={esAdmin && grupo.usaSecciones}
          colorDelGrupo={grupo.color}
          alCrear={() => router.refresh()}
          alCerrar={() => setFormulario(null)}
          alGuardar={(texto) => {
            setFormulario(null);
            setPestana("gastos");
            mostrarAviso(texto);
            router.refresh();
          }}
        />
      )}

      {editorSeccion && (
        <EditorSeccion
          grupoId={grupo.id}
          colorDelGrupo={grupo.color}
          seccion={editorSeccion.seccion}
          alCerrar={() => setEditorSeccion(null)}
          alGuardar={(texto) => {
            setEditorSeccion(null);
            mostrarAviso(texto);
            router.refresh();
          }}
        />
      )}

      <DetalleGasto
        gasto={detalle}
        seccion={detalle ? etiquetaDeSeccion(detalle.seccionId) : null}
        yo={yo}
        nombreDe={nombreDe}
        puedeEditar={!!detalle && !grupo.archivado && (esAdmin || detalle.cargadoPorId === yo)}
        motivoSinEdicion={grupo.archivado ? "El grupo está archivado." : "Lo edita quien lo cargó."}
        alEditar={() => {
          if (!detalle) return;
          setFormulario({ gasto: detalle });
          setDetalle(null);
        }}
        alEliminar={() => {
          if (!detalle) return;
          setConfirmar({ que: "gasto", gasto: detalle });
          setDetalle(null);
        }}
        alCerrar={() => setDetalle(null)}
      />

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
            ? `${confirmar.gasto.descripcion || "Gasto"}, ${formatMoney(confirmar.gasto.monto, confirmar.gasto.moneda)}. Se borra del grupo y del mes de ${compartido ? "cada uno" : "vos"}.`
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
