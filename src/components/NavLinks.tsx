"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/expenses", label: "Gastos" },
  { href: "/recurring", label: "Fijos" },
  { href: "/categories", label: "Categorías" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <>
      {LINKS.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "text-sm font-medium text-slate-900 dark:text-slate-100"
                : "text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
