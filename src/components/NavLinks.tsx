"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const MENU_LINKS = [
  { href: "/expenses", label: "Gastos" },
  { href: "/recurring", label: "Gastos fijos" },
  { href: "/categories", label: "Categorías" },
  { href: "/monthly", label: "Resumen mensual" },
  { href: "/reports", label: "Resumen anual" },
  { href: "/converter", label: "Conversor UYU/USD" },
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

export function NavLinks({ menuDirection = "down" }: { menuDirection?: "down" | "up" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const containerRef = useRef<HTMLDivElement>(null);

  // "up" es la barra flotante del celular: el menú se abre hacia arriba.
  const flotante = menuDirection === "up";
  const tamanoIcono = flotante ? "h-6 w-6" : "h-5 w-5";
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
        className={iconClass(enInicio, flotante)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={tamanoIcono}
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
          className={iconClass(menuActive || open, flotante)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            className={tamanoIcono}
            aria-hidden
          >
            <path d="M4 6.5h16M4 12h16M4 17.5h16" />
          </svg>
        </button>

        {open && (
          <div
            // En el celular el botón queda a la izquierda de la barra, así que
            // el menú se abre hacia la derecha para no salirse de la pantalla.
            className={`absolute z-30 flex w-52 flex-col gap-0.5 rounded-md border border-borde bg-superficie p-1.5 shadow-lg shadow-black/10 ${
              flotante ? "bottom-full left-0 mb-4" : "top-full right-0 mt-3"
            }`}
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
