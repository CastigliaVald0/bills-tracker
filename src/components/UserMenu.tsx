"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { IconoAmigos, IconoCuenta, IconoSalir } from "@/components/navegacion";

const TAMANO_ICONO = "h-[18px] w-[18px] shrink-0";
const FILA =
  "flex items-center gap-3 rounded px-3 py-2 text-sm text-suave transition-colors hover:bg-superficie-alta hover:text-texto";

export function UserMenu({
  name,
  email,
  menuDirection = "down",
}: {
  name: string | null | undefined;
  email: string | null | undefined;
  menuDirection?: "down" | "up";
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const trimmedName = name?.trim();
  const initial = (trimmedName?.[0] ?? email?.[0] ?? "?").toUpperCase();

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="monto flex h-8 w-8 items-center justify-center rounded-full bg-accion text-[13px] font-medium text-accion-texto transition-opacity hover:opacity-85"
        aria-label="Cuenta"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {initial}
      </button>

      {open && (
        <div
          className={`absolute right-0 z-30 flex w-60 flex-col gap-0.5 rounded-md border border-borde bg-superficie p-1.5 shadow-lg shadow-black/10 ${
            menuDirection === "up" ? "bottom-full mb-4" : "top-full mt-3"
          }`}
        >
          <div className="truncate border-b border-borde px-3 pb-2.5 pt-2 mb-0.5">
            {trimmedName && (
              <p className="truncate text-sm font-medium text-texto">{trimmedName}</p>
            )}
            <p className="monto truncate text-xs text-tenue">{email}</p>
          </div>
          {/* Amigos vive acá y no en el cajón: es parte de tu perfil, no de la
              navegación de gastos. */}
          <Link href="/amigos" className={FILA}>
            <IconoAmigos className={TAMANO_ICONO} />
            Amigos
          </Link>
          <Link href="/account" className={FILA}>
            <IconoCuenta className={TAMANO_ICONO} />
            Mi cuenta
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={`${FILA} w-full text-left`}
          >
            <IconoSalir className={TAMANO_ICONO} />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
