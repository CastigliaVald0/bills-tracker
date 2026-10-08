"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Marca } from "@/components/Marca";

type Entrada = { href: string; label: string; icono: React.ReactNode };

/**
 * El menú de PC: un cajón que entra desde el borde izquierdo.
 *
 * Antes era un desplegable chico colgado de las tres barritas, que a su vez
 * estaban a la derecha del nombre. Con pocas opciones alcanzaba, pero ya son
 * siete y en una lista suelta no se distingue qué es cargar datos y qué es
 * mirarlos. Acá entran agrupadas y con lugar de sobra.
 *
 * Usa el <dialog> nativo por lo mismo que el cartel de confirmación: foco
 * atrapado, Escape y fondo inerte sin programar nada de eso a mano.
 */
export function CajonMenu() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [ultimaRuta, setUltimaRuta] = useState(pathname);
  const dialogo = useRef<HTMLDialogElement>(null);

  // Al navegar, el cajón se cierra solo.
  if (pathname !== ultimaRuta) {
    setUltimaRuta(pathname);
    setAbierto(false);
  }

  useEffect(() => {
    const el = dialogo.current;
    if (!el) return;
    if (abierto && !el.open) el.showModal();
    if (!abierto && el.open) el.close();
  }, [abierto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Abrir menú"
        title="Menú"
        aria-expanded={abierto}
        className="flex h-9 w-9 items-center justify-center rounded-md text-suave transition-colors hover:bg-superficie-alta hover:text-texto"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          className="h-5 w-5"
          aria-hidden
        >
          <path d="M4 6.5h16M4 12h16M4 17.5h16" />
        </svg>
      </button>

      <dialog
        ref={dialogo}
        className="cajon"
        aria-label="Menú de navegación"
        onCancel={(e) => {
          e.preventDefault();
          setAbierto(false);
        }}
        // Clic en el fondo oscuro: el <dialog> recibe el clic cuando cae fuera
        // de su contenido, así que alcanza con comparar el blanco.
        onClick={(e) => {
          if (e.target === dialogo.current) setAbierto(false);
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-borde px-4 py-4">
            <Marca />
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar menú"
              className="flex h-8 w-8 items-center justify-center rounded-md text-suave transition-colors hover:bg-superficie-alta hover:text-texto"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                className="h-[18px] w-[18px]"
                aria-hidden
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
            <Grupo entradas={DIARIO} pathname={pathname} />
            <Grupo titulo="Resúmenes" entradas={RESUMENES} pathname={pathname} />
            <Grupo titulo="Herramientas" entradas={HERRAMIENTAS} pathname={pathname} />
          </nav>
        </div>
      </dialog>
    </>
  );
}

function Grupo({
  titulo,
  entradas,
  pathname,
}: {
  titulo?: string;
  entradas: Entrada[];
  pathname: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      {titulo && <p className="rotulo mb-1 px-3">{titulo}</p>}
      {entradas.map((entrada) => {
        const activo = pathname.startsWith(entrada.href);
        return (
          <Link
            key={entrada.href}
            href={entrada.href}
            aria-current={activo ? "page" : undefined}
            className={`relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
              activo
                ? "bg-superficie-alta font-medium text-texto"
                : "text-suave hover:bg-superficie-alta hover:text-texto"
            }`}
          >
            {/* El mismo filete de color que marca la categoría en las listas. */}
            {activo && <span aria-hidden className="filete rounded-l-md bg-peso" />}
            <span className="shrink-0">{entrada.icono}</span>
            {entrada.label}
          </Link>
        );
      })}
    </div>
  );
}

/* --- los íconos, con el trazo de siempre --------------------------------- */

function Icono({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const DIARIO: Entrada[] = [
  {
    href: "/dashboard",
    label: "Inicio",
    icono: (
      <Icono>
        <path d="M3.5 10.5 12 3.5l8.5 7" />
        <path d="M5.5 9.5V20h13V9.5" />
        <path d="M10 20v-5.5h4V20" />
      </Icono>
    ),
  },
  {
    href: "/expenses",
    label: "Gastos",
    icono: (
      <Icono>
        <path d="M6 3.5h12v17l-2.25-1.5L13.5 20.5 12 19l-1.5 1.5L8.25 19 6 20.5z" />
        <path d="M9.25 8.5h5.5M9.25 12.5h5.5" />
      </Icono>
    ),
  },
  {
    href: "/recurring",
    label: "Gastos fijos",
    icono: (
      <Icono>
        <rect x="4" y="5.5" width="16" height="15" rx="2" />
        <path d="M8 3.5v4M16 3.5v4M4 10.5h16" />
        <circle cx="12" cy="15.5" r="1.25" fill="currentColor" stroke="none" />
      </Icono>
    ),
  },
  {
    href: "/categories",
    label: "Categorías",
    icono: (
      <Icono>
        <path d="M3.5 11.2V4.5a1 1 0 0 1 1-1h6.7a1 1 0 0 1 .7.3l8.3 8.3a1 1 0 0 1 0 1.4l-6.7 6.7a1 1 0 0 1-1.4 0L3.8 11.9a1 1 0 0 1-.3-.7z" />
        <circle cx="8" cy="8" r="1.35" fill="currentColor" stroke="none" />
      </Icono>
    ),
  },
];

const RESUMENES: Entrada[] = [
  {
    href: "/monthly",
    label: "Resumen mensual",
    icono: (
      <Icono>
        <path d="M4 19.5h16" />
        <path d="M6.5 19.5v-6M11 19.5V8M15.5 19.5v-9M20 19.5V5" />
      </Icono>
    ),
  },
  {
    href: "/reports",
    label: "Resumen anual",
    // Una porción rellena: es el gráfico que manda en esa pantalla. Sin
    // relleno el contorno se lee como un reloj marcando las tres.
    icono: (
      <Icono>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 12V3.5a8.5 8.5 0 0 1 8.5 8.5z" fill="currentColor" stroke="none" />
      </Icono>
    ),
  },
];

const HERRAMIENTAS: Entrada[] = [
  {
    href: "/converter",
    label: "Conversor",
    icono: (
      <Icono>
        <path d="M4 8h16M16 4l4 4-4 4" />
        <path d="M20 16H4M8 12l-4 4 4 4" />
      </Icono>
    ),
  },
];
