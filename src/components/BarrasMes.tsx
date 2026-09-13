"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { formatMoney, monthShortLabel } from "@/lib/format";

/**
 * Todo lo que toca el navegador (ApexCharts y la lectura de colores del tema)
 * vive en BarrasMesGrafico y se carga solo en el cliente. Este componente sí se
 * renderiza en el servidor, así que acá no se puede usar `window` ni `document`.
 */
const Grafico = dynamic(() => import("./BarrasMesGrafico"), {
  ssr: false,
  loading: () => null,
});

/** Alto de cada fila del gráfico. */
const ALTO_FILA = 32;
const ALTO_EJES = 40;

type Mes = { mes: number; monto: number };

export function BarrasMes({ meses, moneda }: { meses: Mes[]; moneda: "UYU" | "USD" }) {
  const etiquetas = useMemo(
    () => meses.map((m) => monthShortLabel(m.mes).replace(".", "")),
    [meses]
  );
  const montos = useMemo(() => meses.map((m) => m.monto), [meses]);
  const alto = meses.length * ALTO_FILA + ALTO_EJES;

  return (
    <>
      {/* Altura reservada mientras carga ApexCharts, para que la página no salte. */}
      <div style={{ minHeight: alto }} aria-hidden>
        <Grafico etiquetas={etiquetas} montos={montos} moneda={moneda} alto={alto} />
      </div>

      {/* Versión en tabla para lectores de pantalla: el gráfico es un SVG sin
          texto accesible y los montos exactos solo aparecen al pasar el mouse. */}
      <table className="sr-only">
        <caption>Gasto por mes en {moneda === "UYU" ? "pesos" : "dólares"}</caption>
        <tbody>
          {meses.map((m) => (
            <tr key={m.mes}>
              <th scope="row">{monthShortLabel(m.mes)}</th>
              <td>{formatMoney(m.monto, moneda)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
