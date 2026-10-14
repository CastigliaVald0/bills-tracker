"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconoTicket, IconoCalendario, IconoGrupo } from "@/components/navegacion";

/**
 * El botón "Cargar gasto" de la cabecera de PC. Es el mismo gesto que el + de
 * la barra del celular (BotonAgregar): al apretarlo no va a ningún lado, sino
 * que despliega los tipos de gasto que se pueden cargar.
 *
 * Mientras está abierto el botón se atenúa y su + gira hasta ser una ×: deja
 * de ser la acción principal y pasa a ser "cerrar", y el protagonismo se lo
 * llevan las opciones.
 */
const OPCIONES = [
  {
    href: "/expenses",
    titulo: "Gasto",
    detalle: "Una compra o un pago puntual.",
    icono: <IconoTicket className="h-5 w-5" />,
  },
  {
    href: "/recurring",
    titulo: "Gasto fijo",
    detalle: "Se repite todos los meses, o en cuotas.",
    icono: <IconoCalendario className="h-5 w-5" />,
  },
  {
    href: "/grupos",
    titulo: "Gasto grupal",
    detalle: "Dentro de un grupo: una obra, un viaje.",
    icono: <IconoGrupo className="h-5 w-5" />,
  },
];

export function CargarGastoPc() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [ultimaRuta, setUltimaRuta] = useState(pathname);
  const contenedor = useRef<HTMLDivElement>(null);

  if (pathname !== ultimaRuta) {
    setUltimaRuta(pathname);
    setAbierto(false);
  }

  useEffect(() => {
    if (!abierto) return;
    function alTocarAfuera(e: PointerEvent) {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
    }
    function alApretarTecla(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("pointerdown", alTocarAfuera);
    document.addEventListener("keydown", alApretarTecla);
    return () => {
      document.removeEventListener("pointerdown", alTocarAfuera);
      document.removeEventListener("keydown", alApretarTecla);
    };
  }, [abierto]);

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="true"
        className={`boton py-1.5 transition-[background-color,opacity,transform] duration-200 ${
          abierto ? "opacity-45" : ""
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={`h-4 w-4 transition-transform duration-300 ${abierto ? "rotate-45" : ""}`}
          aria-hidden
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Cargar gasto
      </button>

      {abierto && (
        <div className="desplegar absolute right-0 top-full z-30 mt-3 flex w-72 flex-col gap-1 rounded-xl border border-borde bg-superficie p-1.5 shadow-[var(--sombra-flotante)]">
          {OPCIONES.map((opcion) => {
            const activa = pathname.startsWith(opcion.href);
            return (
              <Link
                key={opcion.href}
                href={opcion.href}
                onClick={() => setAbierto(false)}
                aria-current={activa ? "page" : undefined}
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-superficie-alta"
              >
                <span
                  aria-hidden
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    activa
                      ? "border-peso bg-peso/15 text-peso"
                      : "border-borde bg-fondo text-suave group-hover:border-borde-fuerte group-hover:text-texto"
                  }`}
                >
                  {opcion.icono}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-texto">{opcion.titulo}</span>
                  <span className="mt-0.5 block text-xs text-tenue">{opcion.detalle}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
