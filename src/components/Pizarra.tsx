/**
 * Pizarra: el tablero de tinta donde se publican los totales, como la pizarra
 * de cotizaciones de un banco. Las dos monedas van en columnas separadas por
 * un filete, nunca sumadas, cada una con su rótulo en su color.
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
      <div className="px-4 pt-4 sm:px-6 sm:pt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="rotulo text-pizarra-suave">{rotulo}</p>
          {accion}
        </div>
        <h1 className="mt-2 text-lg font-semibold tracking-tight text-pizarra-texto first-letter:uppercase">
          {titulo}
        </h1>
      </div>

      <div className="mt-5 grid grid-cols-2">
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
    <div
      className={`px-4 pb-5 sm:px-6 sm:pb-6 ${
        separador ? "border-l border-pizarra-borde" : ""
      }`}
    >
      <p className="rotulo" style={{ color }}>
        {etiqueta}
      </p>
      <p
        className="monto mt-2 font-light leading-none text-pizarra-texto"
        style={{ fontSize: "clamp(1.05rem, 5vw, 1.75rem)" }}
      >
        {monto}
      </p>
    </div>
  );
}
