/**
 * Pizarra: el tablero de tinta donde se publican los totales, como la pizarra
 * de cotizaciones de un banco. Las dos monedas van en columnas separadas por
 * un filete, nunca sumadas, cada una con su rótulo en su color.
 *
 * El protagonista es el monto, no el título: el período va en cuerpo chico
 * arriba y las cifras se llevan toda la escala. Antes el título pesaba casi lo
 * mismo que los números y el panel quedaba sin jerarquía y con mucho aire.
 */
export function Pizarra({
  rotulo,
  titulo,
  accion,
  pesos,
  dolares,
}: {
  rotulo: string;
  titulo: string;
  accion?: React.ReactNode;
  pesos: string;
  dolares: string;
}) {
  return (
    <section className="pizarra-panel aparece">
      <div className="px-5 pt-5 sm:px-7 sm:pt-6">
        <div className="flex items-center justify-between gap-3">
          <p className="rotulo text-pizarra-suave">{rotulo}</p>
          {accion}
        </div>
        <h1 className="mt-1.5 text-base font-medium tracking-tight text-pizarra-texto first-letter:uppercase">
          {titulo}
        </h1>
      </div>

      <div className="mt-6 grid grid-cols-2 sm:mt-7">
        <Columna etiqueta="Pesos" monto={pesos} color="var(--peso-luz)" />
        <Columna
          etiqueta="Dólares"
          monto={dolares}
          color="var(--dolar-luz)"
          separador
        />
      </div>
    </section>
  );
}

function Columna({
  etiqueta,
  monto,
  color,
  separador = false,
}: {
  etiqueta: string;
  monto: string;
  color: string;
  separador?: boolean;
}) {
  return (
    <div className="relative px-5 pb-6 sm:px-7 sm:pb-7">
      {/* El filete va suelto y sin tocar los bordes: un borde completo cortaría
          el panel en dos mitades y acá son dos lecturas de lo mismo. */}
      {separador && (
        <span aria-hidden className="absolute inset-y-1 left-0 w-px bg-pizarra-borde" />
      )}
      <p className="rotulo" style={{ color }}>
        {etiqueta}
      </p>
      <p
        className="monto mt-2.5 leading-[0.95] text-pizarra-texto"
        style={{ fontSize: "clamp(1.375rem, 4.5vw, 2.5rem)" }}
      >
        {monto}
      </p>
    </div>
  );
}
