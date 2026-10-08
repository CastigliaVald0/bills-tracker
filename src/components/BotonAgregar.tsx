"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconoTicket, IconoCalendario } from "@/components/navegacion";

/**
 * El botón central de la barra flotante. Al tocarlo se despliegan arriba dos
 * círculos más chicos, uno por cada tipo de gasto que se puede cargar: el de
 * todos los días y el fijo. El + gira y pasa a ser la × que los cierra.
 *
 * `x` e `y` son hasta dónde se corre cada círculo desde el centro del botón.
 */
/** Los círculos de la barra los muestran un poco más grandes. */
const TAMANO_BARRA = "h-[22px] w-[22px]";

const OPCIONES = [
  { href: "/expenses", etiqueta: "Gasto", x: -42, y: -72, icono: <IconoTicket className={TAMANO_BARRA} /> },
  { href: "/recurring", etiqueta: "Gasto fijo", x: 42, y: -72, icono: <IconoCalendario className={TAMANO_BARRA} /> },
];

export function BotonAgregar() {
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
    <div ref={contenedor} className="boton-central absolute left-1/2 top-1/2 h-16 w-16">
      {OPCIONES.map((opcion, i) => {
        const activa = pathname.startsWith(opcion.href);
        return (
          <Link
            key={opcion.href}
            href={opcion.href}
            aria-label={opcion.etiqueta}
            title={opcion.etiqueta}
            // Cerradas quedan escondidas detrás del botón: no se pueden tocar
            // ni alcanzar con el teclado.
            tabIndex={abierto ? 0 : -1}
            aria-hidden={!abierto}
            onClick={() => setAbierto(false)}
            className={`absolute left-1/2 top-1/2 -ml-6 -mt-6 flex h-12 w-12 items-center justify-center rounded-full border shadow-lg shadow-black/20 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
              activa ? "border-peso bg-superficie text-peso" : "border-borde bg-superficie text-texto"
            } ${abierto ? "opacity-100" : "pointer-events-none opacity-0"}`}
            style={{
              transform: abierto
                ? `translate(${opcion.x}px, ${opcion.y}px)`
                : "translate(0, 0) scale(0.4)",
              // El segundo sale un instante después que el primero.
              transitionDelay: abierto ? `${i * 45}ms` : "0ms",
            }}
          >
            {opcion.icono}
          </Link>
        );
      })}

      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label={abierto ? "Cerrar" : "Agregar gasto"}
        title={abierto ? "Cerrar" : "Agregar gasto"}
        aria-expanded={abierto}
        aria-haspopup="true"
        className="relative flex h-full w-full items-center justify-center rounded-full bg-accion text-accion-texto shadow-lg shadow-black/25 transition-colors hover:bg-accion-alta"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          className={`h-7 w-7 transition-transform duration-300 ${abierto ? "rotate-45" : ""}`}
          aria-hidden
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}

/** Un ticket de compra: el gasto de todos los días. */

/** Un calendario con el día marcado: el gasto que vuelve todos los meses. */
