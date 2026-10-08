import type { ReactNode } from "react";

/**
 * Las pantallas de la app con su nombre y su ícono, en un solo lugar.
 *
 * Lo consumen el cajón de PC y el menú del celular. Antes los trazos vivían
 * dentro del cajón; copiarlos al celular era repetir la historia de la pizarra
 * del conversor, que tuvo su copia a mano hasta que las dos se separaron.
 */
export type EntradaNav = { href: string; label: string; icono: ReactNode };

function Icono({ children, className = "h-[18px] w-[18px]" }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

/* Los mismos trazos, como componentes, para quien los necesita sueltos y en
   otro tamaño: el botón + de la barra y los bloques de estado vacío. */

export function IconoTicket({ className }: { className?: string }) {
  return (
    <Icono className={className}>
      <path d="M6 3.5h12v17l-2.25-1.5L13.5 20.5 12 19l-1.5 1.5L8.25 19 6 20.5z" />
      <path d="M9.25 8.5h5.5M9.25 12.5h5.5" />
    </Icono>
  );
}

export function IconoCalendario({ className }: { className?: string }) {
  return (
    <Icono className={className}>
      <rect x="4" y="5.5" width="16" height="15" rx="2" />
      <path d="M8 3.5v4M16 3.5v4M4 10.5h16" />
      <circle cx="12" cy="15.5" r="1.25" fill="currentColor" stroke="none" />
    </Icono>
  );
}

export function IconoEtiqueta({ className }: { className?: string }) {
  return (
    <Icono className={className}>
      <path d="M3.5 11.2V4.5a1 1 0 0 1 1-1h6.7a1 1 0 0 1 .7.3l8.3 8.3a1 1 0 0 1 0 1.4l-6.7 6.7a1 1 0 0 1-1.4 0L3.8 11.9a1 1 0 0 1-.3-.7z" />
      <circle cx="8" cy="8" r="1.35" fill="currentColor" stroke="none" />
    </Icono>
  );
}

export function IconoPizarra({ className }: { className?: string }) {
  return (
    <Icono className={className}>
      <rect x="3" y="4.5" width="18" height="13" rx="2" />
      <path d="M7.5 9h4M7.5 13h4M15 9h1.5M15 13h1.5M12 17.5v3M9 20.5h6" />
    </Icono>
  );
}

const INICIO: EntradaNav = {
  href: "/dashboard",
  label: "Inicio",
  icono: (
    <Icono>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M10 20v-5.5h4V20" />
    </Icono>
  ),
};

const GASTOS: EntradaNav = {
  href: "/expenses",
  label: "Gastos",
  icono: <IconoTicket />,
};

const GASTOS_FIJOS: EntradaNav = {
  href: "/recurring",
  label: "Gastos fijos",
  icono: <IconoCalendario />,
};

const CATEGORIAS: EntradaNav = {
  href: "/categories",
  label: "Categorías",
  icono: <IconoEtiqueta />,
};

const RESUMEN_MENSUAL: EntradaNav = {
  href: "/monthly",
  label: "Resumen mensual",
  // Barras: es el gráfico que manda en esa pantalla.
  icono: (
    <Icono>
      <path d="M4 19.5h16" />
      <path d="M6.5 19.5v-6M11 19.5V8M15.5 19.5v-9M20 19.5V5" />
    </Icono>
  ),
};

const RESUMEN_ANUAL: EntradaNav = {
  href: "/reports",
  label: "Resumen anual",
  // Una porción rellena: sin relleno el contorno se lee como un reloj.
  icono: (
    <Icono>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 12V3.5a8.5 8.5 0 0 1 8.5 8.5z" fill="currentColor" stroke="none" />
    </Icono>
  ),
};

const CONVERSOR: EntradaNav = {
  href: "/converter",
  label: "Conversor",
  icono: (
    <Icono>
      <path d="M4 8h16M16 4l4 4-4 4" />
      <path d="M20 16H4M8 12l-4 4 4 4" />
    </Icono>
  ),
};

/* --- cómo se agrupan en cada lado -------------------------------------- */

/** El cajón de PC: todo, en tres bloques. */
export const CAJON_DIARIO = [INICIO, GASTOS, GASTOS_FIJOS, CATEGORIAS];
export const CAJON_RESUMENES = [RESUMEN_MENSUAL, RESUMEN_ANUAL];
export const CAJON_HERRAMIENTAS = [CONVERSOR];

/**
 * El menú del celular: lo mismo, menos lo que ya está en la barra de abajo
 * (inicio y conversor tienen su propio ícono) y menos cargar gastos, que se
 * hace desde el botón + del centro.
 */
export const MENU_CELULAR = [CATEGORIAS, RESUMEN_MENSUAL, RESUMEN_ANUAL];
