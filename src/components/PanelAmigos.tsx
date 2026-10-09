"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Aviso, useAvisoTemporal } from "@/components/Aviso";
import { Confirmar } from "@/components/Confirmar";
import { Vacio } from "@/components/Vacio";
import { MINIMO_BUSQUEDA } from "@/lib/amigos";
import { IconoAmigos } from "@/components/navegacion";

type Persona = { id: string; name: string | null; email?: string | null };
type Solicitud = { id: string; persona: Persona; cuando: string | Date };
type Hallazgo = { id: string; nombre: string | null; final: string };

const nombreDe = (p: Persona | Hallazgo) =>
  ("name" in p ? p.name : p.nombre)?.trim() || "Sin nombre";

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

  return (
    <div className="flex flex-col gap-8">
      {/* Tu código: es a la vez lo que dictás y lo que mandás por mensaje. */}
      <section className="tarjeta filo px-4 py-4 sm:px-5 sm:py-5">
        <p className="rotulo">Tu código</p>
        <p className="monto mt-2 text-2xl tracking-wide text-texto">{codigo}</p>
        <p className="mt-2 text-sm text-suave">
          Pasáselo a quien quieras agregar, o mandale el enlace de invitación.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(codigo);
              mostrarAviso("Código copiado.");
            }}
            className="boton-linea"
          >
            Copiar código
          </button>
          <button type="button" onClick={compartir} className="boton">
            Compartir invitación
          </button>
        </div>
      </section>

      {error && <Aviso tono="error">{error}</Aviso>}
      {aviso && <Aviso tono="ok">{aviso}</Aviso>}

      <section>
        <h2 className="rotulo mb-3">Agregar a alguien</h2>
        <div className="tarjeta flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="codigo-amigo" className="rotulo">Por código</label>
            <div className="flex flex-wrap gap-2">
              <input
                id="codigo-amigo"
                value={codigoIngresado}
                onChange={(e) => setCodigoIngresado(e.target.value)}
                placeholder="BT-XXXXXX"
                autoComplete="off"
                className="campo monto w-auto flex-1 uppercase"
              />
              <button
                type="button"
                disabled={ocupado || codigoIngresado.trim() === ""}
                onClick={async () => {
                  const ok = await pedir(
                    "/api/amigos/solicitudes", "POST",
                    { codigo: codigoIngresado }, "Solicitud enviada."
                  );
                  if (ok) setCodigoIngresado("");
                }}
                className="boton"
              >
                Enviar
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-borde pt-4">
            <label htmlFor="buscar-amigo" className="rotulo">Por nombre</label>
            <input
              id="buscar-amigo"
              value={consulta}
              onChange={(e) => buscar(e.target.value)}
              placeholder="Al menos 3 letras"
              autoComplete="off"
              className="campo"
            />
            <p className="text-xs text-tenue">
              Solo aparece quien lo haya permitido. Nunca se muestra el correo de
              nadie: ves el nombre y las últimas letras del código.
            </p>

            {/* El ajuste vive acá y no en Mi cuenta porque es donde se ve su
                efecto: al lado del buscador que lo usa. */}
            <label className="mt-2 flex items-start gap-2.5 text-sm text-suave">
              <input
                type="checkbox"
                checked={visible}
                disabled={ocupado}
                onChange={async (e) => {
                  const nuevoValor = e.target.checked;
                  setVisible(nuevoValor);
                  const ok = await pedir(
                    "/api/amigos/visibilidad", "PATCH",
                    { buscablePorNombre: nuevoValor },
                    nuevoValor ? "Ahora te pueden encontrar por nombre." : "Listo, ya no aparecés en la búsqueda."
                  );
                  // Si falló, la casilla no puede quedar mintiendo.
                  if (!ok) setVisible(!nuevoValor);
                }}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--peso)]"
              />
              <span>
                Que me puedan encontrar por nombre.{" "}
                <span className="text-tenue">
                  Apagado, a vos solo te pueden agregar con tu código.
                </span>
              </span>
            </label>

            {hallazgos !== null && (
              <div className="mt-2">
                {buscando ? (
                  <p className="text-sm text-suave">Buscando…</p>
                ) : hallazgos.length === 0 ? (
                  <p className="text-sm text-suave">Nadie con ese nombre se deja encontrar.</p>
                ) : (
                  <ul className="lista">
                    {hallazgos.map((h) => (
                      <li key={h.id} className="fila">
                        <span className="min-w-0 flex-1 truncate text-sm text-texto">
                          {nombreDe(h)}{" "}
                          <span className="monto text-xs text-tenue">···{h.final}</span>
                        </span>
                        <button
                          type="button"
                          disabled={ocupado}
                          onClick={() =>
                            pedir("/api/amigos/solicitudes", "POST", { usuarioId: h.id }, "Solicitud enviada.")
                          }
                          className="boton-mini shrink-0"
                        >
                          Enviar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {recibidas.length > 0 && (
        <section>
          <h2 className="rotulo mb-3">Te quieren agregar</h2>
          <ul className="lista">
            {recibidas.map((s) => (
              <li key={s.id} className="fila">
                <span className="min-w-0 flex-1 truncate text-sm text-texto">
                  {nombreDe(s.persona)}
                </span>
                <span className="flex shrink-0 gap-2">
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
                    className="boton py-1"
                  >
                    Aceptar
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {enviadas.length > 0 && (
        <section>
          <h2 className="rotulo mb-3">Esperando respuesta</h2>
          <ul className="lista">
            {enviadas.map((s) => (
              <li key={s.id} className="fila">
                <span className="min-w-0 flex-1 truncate text-sm text-suave">
                  {nombreDe(s.persona)}
                </span>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() =>
                    pedir("/api/amigos/solicitudes", "DELETE",
                      { usuarioId: s.persona.id }, "Solicitud cancelada.")
                  }
                  className="boton-mini shrink-0"
                >
                  Cancelar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="rotulo mb-3">Tus amigos</h2>
        {amigos.length === 0 ? (
          <Vacio
            icono={<IconoAmigos className="h-[22px] w-[22px]" />}
            titulo="Todavía no agregaste a nadie"
            detalle="Pasale tu código a alguien, o mandale el enlace de invitación con el botón de arriba."
          />
        ) : (
          <ul className="lista">
            {amigos.map((a) => (
              <li key={a.id} className="fila">
                <span className="min-w-0 flex-1 truncate text-sm text-texto">{nombreDe(a)}</span>
                <button
                  type="button"
                  onClick={() => setPorQuitar(a)}
                  className="boton-mini boton-mini-peligro shrink-0"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

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
