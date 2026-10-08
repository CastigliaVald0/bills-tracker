"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Marca } from "@/components/Marca";
import {
  CAJON_DIARIO,
  CAJON_RESUMENES,
  CAJON_HERRAMIENTAS,
  type EntradaNav,
} from "@/components/navegacion";

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
            <Grupo entradas={CAJON_DIARIO} pathname={pathname} />
            <Grupo titulo="Resúmenes" entradas={CAJON_RESUMENES} pathname={pathname} />
            <Grupo titulo="Herramientas" entradas={CAJON_HERRAMIENTAS} pathname={pathname} />
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
  entradas: EntradaNav[];
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
