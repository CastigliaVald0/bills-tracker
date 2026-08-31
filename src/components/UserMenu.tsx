"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";

export function UserMenu({
  name,
  email,
  menuDirection = "down",
}: {
  name: string | null | undefined;
  email: string | null | undefined;
  menuDirection?: "down" | "up";
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
        aria-label="Cuenta"
      >
        {initial}
      </button>

      {open && (
        <div
          className={`absolute right-0 z-10 flex w-56 flex-col gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-md dark:border-slate-800 dark:bg-slate-900 ${
            menuDirection === "up" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          <div className="truncate px-3 py-1.5">
            {trimmedName && (
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{trimmedName}</p>
            )}
            <p className="truncate text-sm text-slate-500">{email}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-md px-3 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
