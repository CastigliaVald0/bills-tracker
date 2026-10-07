"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * La respuesta de la app después de apretar un botón.
 *
 * Antes no había ninguna: cargabas un gasto, el formulario se vaciaba y la
 * lista cambiaba más abajo, fuera de pantalla en el celular. Y para un lector
 * de pantalla no se anunciaba nada, porque el texto aparecía sin región viva.
 *
 * `error` interrumpe (assertive) porque frena lo que estabas haciendo; `ok`
 * espera a que el lector termine la frase en curso (polite).
 */
export function Aviso({
  id,
  tono,
  children,
}: {
  /** Para enlazarlo desde el campo con aria-describedby. */
  id?: string;
  tono: "ok" | "error";
  children: React.ReactNode;
}) {
  const esError = tono === "error";

  return (
    <p
      id={id}
      role={esError ? "alert" : "status"}
      aria-live={esError ? "assertive" : "polite"}
      className={`flex items-center gap-2 text-sm ${esError ? "text-alerta" : "text-ok"}`}
    >
      {!esError && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0"
          aria-hidden
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
      {children}
    </p>
  );
}

/** Un mensaje que se borra solo. Devuelve el texto actual y cómo mostrarlo. */
export function useAvisoTemporal(ms = 4000) {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrar = useCallback(
    (texto: string) => {
      if (temporizador.current) clearTimeout(temporizador.current);
      setMensaje(texto);
      temporizador.current = setTimeout(() => setMensaje(null), ms);
    },
    [ms]
  );

  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current);
  }, []);

  return [mensaje, mostrar] as const;
}

/**
 * Lleva el foco al campo que falló y lo enlaza con el texto del error.
 *
 * Un error anunciado pero sin foco obliga a buscar a mano dónde estaba el
 * problema, que en un formulario largo es exactamente lo que no se quiere.
 */
export function enfocarCampoConError(id: string) {
  const campo = document.getElementById(id);
  if (!(campo instanceof HTMLElement)) return;
  campo.focus({ preventScroll: false });
}
