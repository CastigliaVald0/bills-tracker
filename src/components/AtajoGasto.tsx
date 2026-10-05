import Link from "next/link";

/**
 * Atajo flotante para cargar un gasto sin pasar por el menú.
 *
 * Solo en PC: en el celular el mismo botón vive en el centro de la barra
 * flotante de abajo. El contenedor repite el ancho de la columna (max-w-3xl
 * px-4) en vez de pegarse al borde de la ventana: así el botón queda alineado
 * con el contenido y no suelto en la esquina.
 */
export function AtajoGasto() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-8 z-10 mx-auto hidden max-w-3xl justify-end px-4 sm:flex">
      <Link
        href="/expenses"
        aria-label="Agregar gasto"
        title="Agregar gasto"
        className="boton-flotante pointer-events-auto"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          className="h-6 w-6"
          aria-hidden
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </Link>
    </div>
  );
}
