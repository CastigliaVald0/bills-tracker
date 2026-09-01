"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const MENU_LINKS = [
  { href: "/expenses", label: "Gastos" },
  { href: "/recurring", label: "Gastos fijos" },
  { href: "/categories", label: "Categorías" },
  { href: "/reports", label: "Resumen anual" },
  { href: "/converter", label: "Conversor UYU/USD" },
];

function linkClass(active: boolean) {
  return active
    ? "text-sm font-medium text-texto underline decoration-peso decoration-2 underline-offset-[6px] transition-colors"
    : "text-sm text-suave hover:text-texto transition-colors";
}

export function NavLinks({ menuDirection = "down" }: { menuDirection?: "down" | "up" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const containerRef = useRef<HTMLDivElement>(null);

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
      <Link href="/dashboard" className={linkClass(pathname.startsWith("/dashboard"))}>
        Dashboard
      </Link>

      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`flex items-center gap-1 ${linkClass(menuActive)}`}
        >
          Menú
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {open && (
          <div
            className={`absolute right-0 z-30 flex w-52 flex-col gap-0.5 rounded-md border border-borde bg-superficie p-1.5 shadow-lg shadow-black/10 ${
              menuDirection === "up" ? "bottom-full mb-3" : "top-full mt-3"
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
