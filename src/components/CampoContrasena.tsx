"use client";

import { useState } from "react";

/**
 * Campo de contraseña con botón para mostrarla u ocultarla.
 * Reemplaza solo al <input>: la etiqueta la sigue poniendo cada formulario.
 */
export function CampoContrasena({
  id,
  value,
  onChange,
  autoComplete,
  placeholder = "••••••••",
  required,
  minLength,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
  required?: boolean;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        className="campo pr-11"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
        title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        className="absolute right-1 top-1/2 flex h-7 w-9 -translate-y-1/2 items-center justify-center rounded text-suave transition-colors hover:text-texto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peso"
      >
        {visible ? <IconoOjoTachado /> : <IconoOjo />}
      </button>
    </div>
  );
}

function IconoOjo() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M1.7 10S4.9 4.8 10 4.8 18.3 10 18.3 10 15.1 15.2 10 15.2 1.7 10 1.7 10Z" />
      <circle cx="10" cy="10" r="2.4" />
    </svg>
  );
}

function IconoOjoTachado() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M8.6 5A7.4 7.4 0 0 1 10 4.8c5.1 0 8.3 5.2 8.3 5.2a15.3 15.3 0 0 1-2.4 3" />
      <path d="M5.4 6.1A15.2 15.2 0 0 0 1.7 10S4.9 15.2 10 15.2c1.4 0 2.7-.4 3.8-1" />
      <path d="M8.3 8.3a2.4 2.4 0 0 0 3.4 3.4" />
      <path d="M3 3l14 14" />
    </svg>
  );
}
