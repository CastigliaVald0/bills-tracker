"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const MENU_LINKS = [
  { href: "/expenses", label: "Gastos" },
  { href: "/recurring", label: "Fijos" },
  { href: "/categories", label: "Categorías" },
  { href: "/reports", label: "Resumen anual" },
];

function linkClass(active: boolean) {
  return active
    ? "text-sm font-medium text-slate-900 dark:text-slate-100"
    : "text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100";
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
            className={`absolute right-0 z-10 flex w-44 flex-col gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-md dark:border-slate-800 dark:bg-slate-900 ${
              menuDirection === "up" ? "bottom-full mb-2" : "top-full mt-2"
            }`}
          >
            {MENU_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  pathname.startsWith(link.href)
                    ? "bg-slate-100 font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
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
