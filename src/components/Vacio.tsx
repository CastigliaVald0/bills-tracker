import Link from "next/link";
import {
  IconoTicket as TicketBase,
  IconoCalendario as CalendarioBase,
  IconoEtiqueta as EtiquetaBase,
  IconoPizarra as PizarraBase,
} from "@/components/navegacion";

/** Los bloques de vacío los muestran más grandes que los del menú. */
const TAMANO = "h-[22px] w-[22px]";

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

/* Los íconos viven en navegacion.tsx, que es de donde los toman también el
   cajón y el menú del celular. Se reexportan con el tamaño de estos bloques
   para no obligar a cada página a saber de dónde salen. */

export function IconoTicket() {
  return <TicketBase className={TAMANO} />;
}

export function IconoCalendario() {
  return <CalendarioBase className={TAMANO} />;
}

export function IconoEtiqueta() {
  return <EtiquetaBase className={TAMANO} />;
}

export function IconoPizarra() {
  return <PizarraBase className={TAMANO} />;
}
