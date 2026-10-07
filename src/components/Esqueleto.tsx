/**
 * El hueco con la forma de lo que viene.
 *
 * Reemplaza al "Cargando..." centrado en una caja, que además de no decir nada
 * medía distinto que la lista real: al llegar los datos la página pegaba un
 * salto. Acá cada fila ocupa el mismo alto que ocupará de verdad, así no se
 * mueve nada.
 *
 * El latido es suave y se apaga con `prefers-reduced-motion`.
 */
export function EsqueletoLista({
  filas = 4,
  dosLineas = true,
}: {
  filas?: number;
  /** Las listas de gastos tienen descripción y debajo fecha y categoría. */
  dosLineas?: boolean;
}) {
  return (
    <div className="lista" aria-hidden>
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="fila">
          <div className="min-w-0 flex-1">
            <span className="hueso block h-3.5 w-32 rounded" />
            {dosLineas && <span className="hueso mt-2 block h-2.5 w-24 rounded" />}
          </div>
          <span className="hueso h-3.5 w-20 shrink-0 rounded" />
        </div>
      ))}
    </div>
  );
}
