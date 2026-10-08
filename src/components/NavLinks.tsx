"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * El menú del celular. En PC la navegación vive en CajonMenu, que entra por el
 * costado y tiene lugar para todo.
 *
 * Cargar gastos y gastos fijos no está acá: en el celular eso se hace con el
 * botón + del centro de la barra, que despliega los dos tipos. Repetirlos
 * sería dar dos caminos al mismo lugar desde la misma barra.
 */
const MENU_LINKS: { href: string; label: string }[] = [
  { href: "/categories", label: "Categorías" },
  { href: "/monthly", label: "Resumen mensual" },
  { href: "/reports", label: "Resumen anual" },
];

/**
 * En la barra de arriba (PC) el ícono activo lleva una raya debajo. En la barra
 * flotante del celular no hay lugar para la raya: el activo se marca con una
 * pastilla del color del peso, y el botón crece para que el dedo no erre.
 */
function iconClass(active: boolean, flotante: boolean) {
  if (flotante) {
    return `flex h-11 w-14 items-center justify-center rounded-full transition-colors ${
      active ? "bg-peso/15 text-peso" : "text-suave hover:text-texto"
    }`;
  }
  return `relative flex items-center transition-colors ${
    active
      ? "text-texto after:absolute after:inset-x-0 after:-bottom-1.5 after:h-0.5 after:bg-peso"
      : "text-suave hover:text-texto"
  }`;
}

export function NavLinks() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const containerRef = useRef<HTMLDivElement>(null);

  const enInicio = pathname.startsWith("/dashboard");
  const menuActive = MENU_LINKS.some((link) => pathname.startsWith(link.href));

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <>
      <Link
        href="/dashboard"
        aria-label="Inicio"
        title="Inicio"
        aria-current={enInicio ? "page" : undefined}
        className={iconClass(enInicio, true)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
          aria-hidden
        >
          <path d="M3.5 10.5 12 3.5l8.5 7" />
          <path d="M5.5 9.5V20h13V9.5" />
          <path d="M10 20v-5.5h4V20" />
        </svg>
      </Link>

      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menú"
          title="Menú"
          aria-expanded={open}
          aria-haspopup="true"
          className={iconClass(menuActive || open, true)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            className="h-6 w-6"
            aria-hidden
          >
            <path d="M4 6.5h16M4 12h16M4 17.5h16" />
          </svg>
        </button>

        {open && (
          <div
            // El botón queda a la izquierda de la barra, así que el menú se
            // abre hacia arriba y hacia la derecha para no salirse.
            className="absolute bottom-full left-0 z-30 mb-4 flex w-52 flex-col gap-0.5 rounded-md border border-borde bg-superficie p-1.5 shadow-lg shadow-black/10"
          >
            {MENU_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded px-3 py-2 text-sm transition-colors ${
                  pathname.startsWith(link.href)
                    ? "bg-superficie-alta font-medium text-texto"
                    : "text-suave hover:bg-superficie-alta hover:text-texto"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Acceso directo al conversor, fuera del menú: va al lado de la cuenta. Las dos
 * flechas enfrentadas son el ida y vuelta entre pesos y dólares.
 */
export function ConversorLink({ flotante = false }: { flotante?: boolean }) {
  const activo = usePathname().startsWith("/converter");

  return (
    <Link
      href="/converter"
      aria-label="Conversor UYU/USD"
      title="Conversor UYU/USD"
      aria-current={activo ? "page" : undefined}
      className={iconClass(activo, flotante)}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={flotante ? "h-6 w-6" : "h-5 w-5"}
        aria-hidden
      >
        <path d="M4 8h16M16 4l4 4-4 4" />
        <path d="M20 16H4M8 12l-4 4 4 4" />
      </svg>
    </Link>
  );
}
