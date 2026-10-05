"use client";

import { useEffect, useRef, useState } from "react";

/** Cuánto hay que mover el dedo para que cuente como "está bajando" o "está subiendo". */
const UMBRAL = 8;
/** Cerca del tope de la página la barra siempre va a tamaño completo. */
const ZONA_SUPERIOR = 24;

/**
 * La barra flotante del celular. Se comprime un poco mientras se baja por la
 * página, para tapar menos contenido, y vuelve a su tamaño apenas se sube.
 *
 * Solo decide el estado; cómo se ve comprimida está en globals.css
 * (.barra-flotante[data-compacta]).
 */
export function BarraFlotante({ children }: { children: React.ReactNode }) {
  const [compacta, setCompacta] = useState(false);
  const barra = useRef<HTMLElement>(null);

  useEffect(() => {
    let anterior = window.scrollY;

    function alDesplazar() {
      // En iPhone el rebote del final deja valores fuera de rango: se recortan
      // para que el rebote no cuente como un cambio de dirección.
      const maximo = document.documentElement.scrollHeight - window.innerHeight;
      const actual = Math.min(Math.max(window.scrollY, 0), Math.max(maximo, 0));
      const diferencia = actual - anterior;

      if (actual <= ZONA_SUPERIOR) {
        setCompacta(false);
      } else if (Math.abs(diferencia) < UMBRAL) {
        return;
      } else if (diferencia > 0) {
        // Con un menú abierto no se achica: el menú se achicaría con la barra.
        if (!barra.current?.querySelector('[aria-expanded="true"]')) setCompacta(true);
      } else {
        setCompacta(false);
      }
      anterior = actual;
    }

    window.addEventListener("scroll", alDesplazar, { passive: true });
    return () => window.removeEventListener("scroll", alDesplazar);
  }, []);

  return (
    <nav
      ref={barra}
      data-compacta={compacta}
      // Tocar la barra comprimida la devuelve a su tamaño antes de usarla.
      onPointerDown={() => setCompacta(false)}
      className="barra-flotante fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-20 grid h-14 grid-cols-[1fr_auto_1fr] items-center px-2 sm:hidden"
    >
      {children}
    </nav>
  );
}
