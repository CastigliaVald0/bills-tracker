"use client";

import { useState } from "react";

/**
 * Sección que se abre y se cierra, con un titular visible cuando está cerrada.
 * Sirve para aliviar una página sin esconder información: el resumen de una
 * línea dice lo importante y el detalle está a un toque.
 *
 * El contenido se monta recién al abrirse. Los gráficos de ApexCharts miden su
 * contenedor al crearse; montados dentro de un <details> cerrado medirían 0 y
 * se dibujarían rotos.
 */
export function Desplegable({
  titulo,
  resumen,
  children,
}: {
  titulo: string;
  resumen: React.ReactNode;
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <details
      className="group tarjeta"
      open={abierto}
      onToggle={(e) => setAbierto(e.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <p className="rotulo">{titulo}</p>
          <p className="mt-1 truncate text-sm text-texto">{resumen}</p>
        </div>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4 shrink-0 text-suave transition-transform group-open:rotate-180"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </summary>
      {abierto && <div className="border-t border-borde p-3 sm:p-4">{children}</div>}
    </details>
  );
}
