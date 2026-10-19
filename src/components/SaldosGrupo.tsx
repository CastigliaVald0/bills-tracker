"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Aviso } from "@/components/Aviso";
import { formatMoney } from "@/lib/format";
import { calcularSaldos, simplificarDeudas, type MovimientoDeSaldo, type Deuda } from "@/lib/saldos";

type Persona = { id: string; nombre: string };
type Pago = {
  id: string;
  deId: string;
  aId: string;
  monto: number;
  moneda: "UYU" | "USD";
  fecha: string;
};

/**
 * Quién le debe a quién, ya simplificado: la menor cantidad de pagos que deja
 * a todos en cero, en cada moneda por separado. Cada deuda se marca como
 * pagada de un toque, por cualquiera de los dos que participan.
 */
export function SaldosGrupo({
  grupoId,
  yo,
  personas,
  movimientos,
  pagos,
}: {
  grupoId: string;
  yo: string;
  personas: Persona[];
  movimientos: MovimientoDeSaldo[];
  pagos: Pago[];
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verPagos, setVerPagos] = useState(false);

  const saldos = calcularSaldos(movimientos);
  const deudas = [
    ...simplificarDeudas(saldos.UYU, "UYU"),
    ...simplificarDeudas(saldos.USD, "USD"),
  ];
  const nombre = (id: string) =>
    id === yo ? "Vos" : (personas.find((p) => p.id === id)?.nombre ?? "Alguien");

  // Lo mío primero: lo que debo y lo que me deben.
  const ordenadas = [...deudas].sort(
    (a, b) => Number(b.deId === yo || b.aId === yo) - Number(a.deId === yo || a.aId === yo)
  );

  async function pedir(url: string, metodo: string, cuerpo?: unknown) {
    if (ocupado) return;
    setError(null);
    setOcupado(true);
    try {
      const res = await fetch(url, {
        method: metodo,
        headers: cuerpo ? { "Content-Type": "application/json" } : undefined,
        body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      });
      const datos = await res.json().catch(() => ({}));
      if (!res.ok) setError(datos.error ?? "No se pudo completar la acción.");
      else router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  const frase = (d: Deuda) => {
    if (d.deId === yo) return <>Le debés a <strong className="font-medium text-texto">{nombre(d.aId)}</strong></>;
    if (d.aId === yo) return <><strong className="font-medium text-texto">{nombre(d.deId)}</strong> te debe</>;
    return (
      <>
        <strong className="font-medium text-texto">{nombre(d.deId)}</strong> le debe a{" "}
        <strong className="font-medium text-texto">{nombre(d.aId)}</strong>
      </>
    );
  };

  // El balance de cada persona en cada moneda, como el gráfico de Tricount:
  // cuánto puso de más (le deben) o de menos (debe). Solo las monedas que se
  // usaron en el grupo.
  const balances = (["UYU", "USD"] as const)
    .map((moneda) => {
      const filas = personas.map((p) => ({ id: p.id, saldo: saldos[moneda].get(p.id) ?? 0 }));
      const mayor = Math.max(0, ...filas.map((f) => Math.abs(f.saldo)));
      return { moneda, filas, mayor };
    })
    .filter((b) => movimientos.some((m) => m.moneda === b.moneda));

  return (
    <>
      {balances.length > 0 && (
        <section aria-labelledby="titulo-balance">
          <h2 id="titulo-balance" className="seccion-titulo mb-3">Balance</h2>
          <div className="flex flex-col gap-4">
            {balances.map(({ moneda, filas, mayor }) => (
              <div key={moneda} className="tarjeta px-4 py-4">
                {balances.length > 1 && (
                  <p className={`mb-3 text-xs font-medium ${moneda === "USD" ? "text-dolar" : "text-peso"}`}>
                    {moneda === "USD" ? "En dólares" : "En pesos"}
                  </p>
                )}
                <ul className="flex flex-col gap-3.5">
                  {filas.map((f) => {
                    const alDia = Math.abs(f.saldo) < 0.005;
                    const ancho = mayor > 0 ? (Math.abs(f.saldo) / mayor) * 50 : 0;
                    return (
                      <li key={f.id} className="flex flex-col gap-1.5">
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className={f.id === yo ? "font-medium text-texto" : "text-suave"}>
                            {nombre(f.id)}
                          </span>
                          <span
                            className={`monto font-semibold ${
                              alDia
                                ? "text-tenue"
                                : f.saldo < 0
                                  ? "text-alerta"
                                  : moneda === "USD"
                                    ? "text-dolar"
                                    : "text-peso"
                            }`}
                          >
                            {alDia ? "Al día" : `${f.saldo > 0 ? "+" : "−"} ${formatMoney(Math.abs(f.saldo), moneda)}`}
                          </span>
                        </div>
                        {/* La pista con su mitad marcada: a la derecha le deben,
                            a la izquierda debe. */}
                        <span aria-hidden className="relative block h-2 rounded-full bg-borde/70">
                          <span className="absolute inset-y-0 left-1/2 w-px bg-borde-fuerte" />
                          {!alDia && (
                            <span
                              className={`absolute inset-y-0 rounded-full ${
                                f.saldo < 0 ? "bg-alerta" : moneda === "USD" ? "bg-dolar" : "bg-peso"
                              }`}
                              style={
                                f.saldo > 0
                                  ? { left: "50%", width: `${ancho}%` }
                                  : { right: "50%", width: `${ancho}%` }
                              }
                            />
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <p className="px-1 text-xs text-tenue">
              Con + le deben (puso de más); con − debe (puso de menos). Los pagos anotados ya están descontados.
            </p>
          </div>
        </section>
      )}

      <section aria-labelledby="titulo-saldos">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="titulo-saldos" className="seccion-titulo">Quién le debe a quién</h2>
          {pagos.length > 0 && (
            <button
              type="button"
              onClick={() => setVerPagos((v) => !v)}
              aria-expanded={verPagos}
              className="boton-mini -mr-2"
            >
              {verPagos ? "Ocultar pagos" : `Pagos (${pagos.length})`}
            </button>
          )}
        </div>

        {ordenadas.length === 0 ? (
          <p className="tarjeta px-4 py-4 text-sm text-suave">
            Están todos al día: nadie le debe nada a nadie.
          </p>
        ) : (
          <ul className="lista">
            {ordenadas.map((d) => {
              const meToca = d.deId === yo || d.aId === yo;
              return (
                // La frase arriba y el monto grande abajo: entra en la columna
                // angosta de PC y se lee de un vistazo cuánto es.
                <li key={`${d.deId}-${d.aId}-${d.moneda}`} className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm text-suave">{frase(d)}</p>
                    <p
                      className={`monto mt-1 text-lg font-semibold ${
                        d.moneda === "USD" ? "text-dolar" : "text-peso"
                      }`}
                    >
                      {formatMoney(d.monto, d.moneda)}
                    </p>
                  </div>
                  {/* Solo los dos involucrados pueden anotar que se pagó. */}
                  {meToca && (
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() =>
                        pedir(`/api/grupos/${grupoId}/pagos`, "POST", {
                          deId: d.deId,
                          aId: d.aId,
                          monto: d.monto,
                          moneda: d.moneda,
                        })
                      }
                      className="boton-linea shrink-0 py-1.5"
                    >
                      Marcar pagado
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {verPagos && (
          <ul className="desplegar lista mt-3 flex flex-col">
            {pagos.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="monto w-12 shrink-0 text-xs text-tenue">
                  {p.fecha.slice(8, 10)}/{p.fecha.slice(5, 7)}
                </span>
                <p className="min-w-0 flex-1 truncate text-sm text-suave">
                  {p.deId === yo
                    ? `Le pagaste a ${nombre(p.aId)}`
                    : p.aId === yo
                      ? `${nombre(p.deId)} te pagó`
                      : `${nombre(p.deId)} le pagó a ${nombre(p.aId)}`}
                </p>
                <span className={`monto shrink-0 text-sm ${p.moneda === "USD" ? "text-dolar" : "text-texto"}`}>
                  {formatMoney(p.monto, p.moneda)}
                </span>
                {(p.deId === yo || p.aId === yo) && (
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => pedir(`/api/grupos/${grupoId}/pagos/${p.id}`, "DELETE")}
                    className="boton-mini shrink-0"
                  >
                    Deshacer
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {error && (
          <div className="mt-2">
            <Aviso tono="error">{error}</Aviso>
          </div>
        )}
      </section>
    </>
  );
}
