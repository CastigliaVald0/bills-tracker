"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Aviso, useAvisoTemporal } from "@/components/Aviso";
import { Confirmar } from "@/components/Confirmar";
import { Conmutador } from "@/components/CamposGasto";
import { MINIMO_BUSQUEDA, PREFIJO, finalDelCodigo } from "@/lib/amigos";
import { IconoAmigos } from "@/components/navegacion";

type Persona = {
  id: string;
  name: string | null;
  codigoAmigo?: string | null;
  /** Desde cuándo son amigos; solo viene en la lista de amigos. */
  desde?: string | Date | null;
};
type Solicitud = { id: string; persona: Persona; cuando: string | Date };
type Hallazgo = { id: string; nombre: string | null; final: string };
type Modo = "codigo" | "nombre";

const nombreDe = (p: Persona | Hallazgo) =>
  ("name" in p ? p.name : p.nombre)?.trim() || "Sin nombre";

/** "12 oct" o "oct 2026", siempre en hora de Uruguay para que servidor y
    navegador escriban lo mismo. */
function fecha(valor: string | Date, opciones: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es-UY", { ...opciones, timeZone: "America/Montevideo" })
    .format(new Date(valor))
    .replace(".", "");
}

export function PanelAmigos({
  codigo,
  enlace,
  buscable,
  amigos,
  recibidas,
  enviadas,
}: {
  codigo: string;
  enlace: string;
  buscable: boolean;
  amigos: Persona[];
  recibidas: Solicitud[];
  enviadas: Solicitud[];
}) {
  const router = useRouter();
  const [aviso, mostrarAviso] = useAvisoTemporal();
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [porQuitar, setPorQuitar] = useState<Persona | null>(null);

  const [visible, setVisible] = useState(buscable);
  const [modo, setModo] = useState<Modo>("codigo");
  const [codigoIngresado, setCodigoIngresado] = useState("");
  const [consulta, setConsulta] = useState("");
  const [hallazgos, setHallazgos] = useState<Hallazgo[] | null>(null);
  const [buscando, setBuscando] = useState(false);

  async function pedir(url: string, metodo: string, cuerpo: unknown, exito: string) {
    if (ocupado) return;
    setError(null);
    setOcupado(true);
    try {
      const res = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const datos = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(datos.error ?? "No se pudo completar la acción.");
        return false;
      }
      mostrarAviso(datos.estado === "aceptada" ? "¡Ya son amigos!" : exito);
      router.refresh();
      return true;
    } finally {
      setOcupado(false);
    }
  }

  async function buscar(texto: string) {
    setConsulta(texto);
    if (texto.trim().length < MINIMO_BUSQUEDA) {
      setHallazgos(null);
      return;
    }
    setBuscando(true);
    try {
      const res = await fetch(`/api/amigos/buscar?q=${encodeURIComponent(texto.trim())}`);
      setHallazgos(res.ok ? await res.json() : []);
    } finally {
      setBuscando(false);
    }
  }

  async function compartir() {
    const texto = `Agregame en Billions Tracker: ${enlace}`;
    // El menú nativo de compartir existe en el celular; en PC se copia.
    if (navigator.share) {
      try {
        await navigator.share({ text: texto, url: enlace });
        return;
      } catch {
        // Cancelar el menú no es un error.
        return;
      }
    }
    await navigator.clipboard.writeText(enlace);
    mostrarAviso("Enlace copiado.");
  }

  // El código sin el prefijo, letra por letra: se muestra en casillas porque
  // es algo que se dicta por teléfono o se copia a mano.
  const letras = codigo.startsWith(PREFIJO) ? codigo.slice(PREFIJO.length) : codigo;

  return (
    <div className="flex flex-col gap-10">
      {/* El carnet: tu código es a la vez lo que dictás y lo que mandás por
          mensaje, así que es lo primero y lo más grande de la página. */}
      <section className="tarjeta filo aparece px-4 py-5 sm:px-6 sm:py-6">
        <p className="rotulo">Tu código</p>

        <p className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-2" aria-label={codigo.split("").join(" ")}>
          <span aria-hidden className="monto text-lg text-tenue">
            {PREFIJO.replace("-", "")}
          </span>
          <span aria-hidden className="flex gap-1.5">
            {letras.split("").map((letra, i) => (
              <span key={i} className="casilla">
                {letra}
              </span>
            ))}
          </span>
        </p>

        <p className="mt-4 max-w-prose text-sm leading-relaxed text-suave">
          Dictáselo a quien quieras agregar, o mandale la invitación y se agrega con un toque.
        </p>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-borde pt-4">
          <button type="button" onClick={compartir} className="boton">
            <IconoCompartir />
            Compartir invitación
          </button>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(codigo);
              mostrarAviso("Código copiado.");
            }}
            className="boton-linea"
          >
            <IconoCopiar />
            Copiar código
          </button>
        </div>
      </section>

      {(error || aviso) && (
        <div className="-my-4">
          {error && <Aviso tono="error">{error}</Aviso>}
          {aviso && <Aviso tono="ok">{aviso}</Aviso>}
        </div>
      )}

      {/* Lo que espera una respuesta tuya va antes que todo lo demás. */}
      {recibidas.length > 0 && (
        <section>
          <Encabezado titulo="Te quieren agregar" cantidad={recibidas.length} destacado />
          <ul className="lista">
            {recibidas.map((s) => (
              <FilaPersona
                key={s.id}
                persona={s.persona}
                detalle={`Recibida el ${fecha(s.cuando, { day: "numeric", month: "short" })}`}
              >
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() =>
                    pedir("/api/amigos/solicitudes", "PATCH",
                      { solicitudId: s.id, accion: "rechazar" }, "Solicitud rechazada.")
                  }
                  className="boton-mini"
                >
                  Rechazar
                </button>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() =>
                    pedir("/api/amigos/solicitudes", "PATCH",
                      { solicitudId: s.id, accion: "aceptar" }, "¡Ya son amigos!")
                  }
                  className="boton py-1.5"
                >
                  Aceptar
                </button>
              </FilaPersona>
            ))}
          </ul>
        </section>
      )}

      <section>
        <Encabezado titulo="Agregar a alguien" />
        <div className="tarjeta">
          <div className="flex flex-col gap-4 p-4 sm:p-5">
            {/* Dos caminos excluyentes: se elige uno y se ve solo ese. */}
            <div className="flex">
              <Conmutador<Modo>
                nombreGrupo="modo-agregar"
                etiqueta="Cómo agregar"
                opciones={[
                  { valor: "codigo", texto: "Con su código" },
                  { valor: "nombre", texto: "Por nombre" },
                ]}
                valor={modo}
                alCambiar={setModo}
              />
            </div>

            {modo === "codigo" ? (
              <form
                className="flex flex-col gap-1.5"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (codigoIngresado.trim() === "") return;
                  const ok = await pedir(
                    "/api/amigos/solicitudes", "POST",
                    { codigo: codigoIngresado }, "Solicitud enviada."
                  );
                  if (ok) setCodigoIngresado("");
                }}
              >
                <label htmlFor="codigo-amigo" className="rotulo">El código de la otra persona</label>
                <div className="flex gap-2">
                  <input
                    id="codigo-amigo"
                    value={codigoIngresado}
                    onChange={(e) => setCodigoIngresado(e.target.value)}
                    placeholder={`${PREFIJO}XXXXXX`}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    className="campo monto min-w-0 flex-1 text-base tracking-[0.12em] uppercase"
                  />
                  <button
                    type="submit"
                    disabled={ocupado || codigoIngresado.trim() === ""}
                    className="boton shrink-0"
                  >
                    Enviar
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="buscar-amigo" className="rotulo">Su nombre</label>
                <input
                  id="buscar-amigo"
                  type="search"
                  value={consulta}
                  onChange={(e) => buscar(e.target.value)}
                  placeholder={`Al menos ${MINIMO_BUSQUEDA} letras`}
                  autoComplete="off"
                  className="campo"
                />

                {hallazgos === null ? (
                  <p className="text-xs leading-relaxed text-tenue">
                    Solo aparece quien lo haya permitido. Nunca se muestra el correo de
                    nadie: ves el nombre y las últimas letras de su código.
                  </p>
                ) : buscando ? (
                  <p className="mt-1 text-sm text-suave">Buscando…</p>
                ) : hallazgos.length === 0 ? (
                  <p className="mt-1 text-sm text-suave">
                    Nadie con ese nombre se deja encontrar. Pedile su código.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-col overflow-hidden rounded-lg border border-borde">
                    {hallazgos.map((h) => (
                      <FilaPersona
                        key={h.id}
                        persona={{ id: h.id, name: h.nombre }}
                        detalle={`Código ···${h.final}`}
                        compacta
                      >
                        <button
                          type="button"
                          disabled={ocupado}
                          onClick={() =>
                            pedir("/api/amigos/solicitudes", "POST", { usuarioId: h.id }, "Solicitud enviada.")
                          }
                          className="boton-linea py-1.5"
                        >
                          Agregar
                        </button>
                      </FilaPersona>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* El ajuste vive acá y no en Mi cuenta porque es donde se ve su
              efecto: al lado del buscador que lo usa. */}
          <div className="flex items-start justify-between gap-4 border-t border-borde p-4 sm:px-5">
            <div className="min-w-0">
              <label htmlFor="visible-por-nombre" className="text-sm font-medium text-texto">
                Aparecer en la búsqueda por nombre
              </label>
              <p className="mt-1 text-xs leading-relaxed text-suave">
                {visible
                  ? "Cualquiera que escriba tu nombre te puede mandar una solicitud."
                  : "Apagado, solo te pueden agregar con tu código."}
              </p>
            </div>
            <button
              id="visible-por-nombre"
              type="button"
              role="switch"
              aria-checked={visible}
              disabled={ocupado}
              onClick={async () => {
                const nuevoValor = !visible;
                setVisible(nuevoValor);
                const ok = await pedir(
                  "/api/amigos/visibilidad", "PATCH",
                  { buscablePorNombre: nuevoValor },
                  nuevoValor ? "Ahora te pueden encontrar por nombre." : "Listo, ya no aparecés en la búsqueda."
                );
                // Si falló, el interruptor no puede quedar mintiendo.
                if (!ok) setVisible(!nuevoValor);
              }}
              className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                visible ? "bg-peso" : "bg-borde-fuerte"
              }`}
            >
              <span
                aria-hidden
                className={`inline-block h-5 w-5 rounded-full bg-superficie shadow-sm transition-transform ${
                  visible ? "translate-x-5.5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      <section>
        <Encabezado titulo="Tus amigos" cantidad={amigos.length || undefined} />
        {amigos.length === 0 ? (
          <div className="tarjeta flex flex-col items-center gap-3 px-6 py-9 text-center">
            <span
              aria-hidden
              className="flex h-11 w-11 items-center justify-center rounded-full border border-borde bg-superficie-alta text-tenue"
            >
              <IconoAmigos className="h-[22px] w-[22px]" />
            </span>
            <p className="text-sm font-medium text-texto">Todavía no agregaste a nadie</p>
            <p className="max-w-xs text-sm leading-relaxed text-suave">
              Mandale la invitación a alguien: cuando acepte, aparece acá.
            </p>
            <button type="button" onClick={compartir} className="boton-linea mt-1">
              <IconoCompartir />
              Compartir invitación
            </button>
          </div>
        ) : (
          <ul className="lista">
            {amigos.map((a) => (
              <FilaPersona
                key={a.id}
                persona={a}
                detalle={[
                  a.desde && `Amigos desde ${fecha(a.desde, { month: "short", year: "numeric" })}`,
                  a.codigoAmigo && `···${finalDelCodigo(a.codigoAmigo)}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              >
                <button
                  type="button"
                  onClick={() => setPorQuitar(a)}
                  className="boton-mini boton-mini-peligro"
                >
                  Quitar
                </button>
              </FilaPersona>
            ))}
          </ul>
        )}
      </section>

      {/* Lo que no depende de vos va al final y más apagado. */}
      {enviadas.length > 0 && (
        <section>
          <Encabezado titulo="Esperando respuesta" cantidad={enviadas.length} />
          <ul className="lista">
            {enviadas.map((s) => (
              <FilaPersona
                key={s.id}
                persona={s.persona}
                detalle={`Enviada el ${fecha(s.cuando, { day: "numeric", month: "short" })}`}
                apagada
              >
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() =>
                    pedir("/api/amigos/solicitudes", "DELETE",
                      { usuarioId: s.persona.id }, "Solicitud cancelada.")
                  }
                  className="boton-mini"
                >
                  Cancelar
                </button>
              </FilaPersona>
            ))}
          </ul>
        </section>
      )}

      <Confirmar
        abierto={porQuitar !== null}
        titulo="¿Quitar de tus amigos?"
        detalle={
          porQuitar
            ? `${nombreDe(porQuitar)} deja de estar en tu lista. Podés volver a agregarlo con su código cuando quieras.`
            : ""
        }
        textoConfirmar="Quitar"
        alConfirmar={() => {
          if (porQuitar) {
            const id = porQuitar.id;
            setPorQuitar(null);
            pedir("/api/amigos/solicitudes", "DELETE", { usuarioId: id }, "Listo, lo quitaste.");
          }
        }}
        alCancelar={() => setPorQuitar(null)}
      />
    </div>
  );
}

/** El título de cada bloque, con cuántos hay cuando el número importa. */
function Encabezado({
  titulo,
  cantidad,
  destacado = false,
}: {
  titulo: string;
  cantidad?: number;
  /** Para lo que espera una respuesta tuya: el número va en celeste. */
  destacado?: boolean;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <h2 className="rotulo">{titulo}</h2>
      {cantidad !== undefined && (
        <span
          className={`monto rounded-full px-1.5 py-0.5 text-[11px] leading-none ${
            destacado ? "bg-peso/15 text-peso" : "bg-superficie-alta text-suave"
          }`}
        >
          {cantidad}
        </span>
      )}
    </div>
  );
}

/**
 * Una persona en cualquiera de las listas: su inicial, su nombre, una línea de
 * contexto y, a la derecha, lo que se puede hacer con ella.
 *
 * La inicial se tiñe de celeste o de verde según la persona. No significa
 * nada: es solo para que dos filas seguidas no se vean iguales, y siempre le
 * toca el mismo color a la misma persona.
 */
function FilaPersona({
  persona,
  detalle,
  apagada = false,
  compacta = false,
  children,
}: {
  persona: Persona;
  detalle?: string;
  apagada?: boolean;
  /** Dentro de una tarjeta, sin el aire de una lista suelta. */
  compacta?: boolean;
  children: React.ReactNode;
}) {
  const nombre = nombreDe(persona);
  let suma = 0;
  for (const letra of persona.id) suma += letra.charCodeAt(0);
  const tinte = apagada ? "var(--texto-tenue)" : suma % 2 === 0 ? "var(--peso)" : "var(--dolar)";

  return (
    <li
      className={`flex items-center gap-3 border-borde not-first:border-t ${
        compacta ? "px-3 py-2.5" : "px-4 py-3.5"
      }`}
    >
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
        style={{ backgroundColor: `color-mix(in srgb, ${tinte} 16%, transparent)`, color: tinte }}
      >
        {nombre.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${apagada ? "text-suave" : "text-texto"}`}>
          {nombre}
        </p>
        {detalle && <p className="mt-0.5 truncate text-xs text-tenue">{detalle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">{children}</div>
    </li>
  );
}

function IconoCompartir() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M12 15V4M8 7.5 12 3.5l4 4" />
      <path d="M5.5 12v6.5a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V12" />
    </svg>
  );
}

function IconoCopiar() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2" />
      <path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" />
    </svg>
  );
}
