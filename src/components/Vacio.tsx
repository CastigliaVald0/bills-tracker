import Link from "next/link";

/**
 * El bloque que ocupa el lugar de una lista cuando todavía no hay nada.
 *
 * Antes cada página resolvía esto con una frase gris centrada en una caja, y
 * una cuenta recién creada se veía rota más que vacía. Acá el vacío se trata
 * como un estado más del producto: lleva el filo bicolor de la pizarra, un
 * ícono, un título en tinta plena y una línea que explica qué va a aparecer.
 *
 * `accion` solo se pasa donde el usuario no tiene el formulario a la vista; en
 * las páginas que ya lo muestran arriba, el texto alcanza y un botón sería
 * mandarlo a donde ya está.
 */
export function Vacio({
  icono,
  titulo,
  detalle,
  accion,
}: {
  icono: React.ReactNode;
  titulo: string;
  detalle: string;
  accion?: { href: string; texto: string };
}) {
  return (
    <section className="tarjeta filo aparece flex flex-col items-center gap-3.5 px-6 py-10 text-center">
      <span
        aria-hidden
        className="flex h-11 w-11 items-center justify-center rounded-full border border-borde bg-superficie-alta text-tenue"
      >
        {icono}
      </span>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-semibold text-texto">{titulo}</p>
        <p className="max-w-[34ch] text-balance text-sm leading-relaxed text-suave">{detalle}</p>
      </div>

      {accion && (
        <Link href={accion.href} className="boton mt-1">
          {accion.texto}
        </Link>
      )}
    </section>
  );
}

/* Los íconos repiten el trazo de los de la barra de abajo: 1.75 de grosor,
   puntas redondeadas, sin relleno. */

export function IconoTicket() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[22px] w-[22px]"
      aria-hidden
    >
      <path d="M6 3.5h12v17l-2.25-1.5L13.5 20.5 12 19l-1.5 1.5L8.25 19 6 20.5z" />
      <path d="M9.25 8.5h5.5M9.25 12.5h5.5" />
    </svg>
  );
}

export function IconoCalendario() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[22px] w-[22px]"
      aria-hidden
    >
      <rect x="4" y="5.5" width="16" height="15" rx="2" />
      <path d="M8 3.5v4M16 3.5v4M4 10.5h16" />
      <circle cx="12" cy="15.5" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconoEtiqueta() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[22px] w-[22px]"
      aria-hidden
    >
      <path d="M3.5 11.2V4.5a1 1 0 0 1 1-1h6.7a1 1 0 0 1 .7.3l8.3 8.3a1 1 0 0 1 0 1.4l-6.7 6.7a1 1 0 0 1-1.4 0L3.8 11.9a1 1 0 0 1-.3-.7z" />
      <circle cx="8" cy="8" r="1.35" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconoPizarra() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[22px] w-[22px]"
      aria-hidden
    >
      <rect x="3" y="4.5" width="18" height="13" rx="2" />
      <path d="M7.5 9h4M7.5 13h4M15 9h1.5M15 13h1.5M12 17.5v3M9 20.5h6" />
    </svg>
  );
}
