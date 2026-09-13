"use client";

import { useMemo, useSyncExternalStore } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { formatMoney } from "@/lib/format";

/**
 * El gráfico propiamente dicho. Este módulo se carga SOLO en el navegador (ver
 * BarrasMes): acá se lee el DOM para sacar los colores del tema, y en el
 * servidor `document` no existe. Leerlo en un componente que también se
 * renderiza en el servidor tira un 500.
 */

const CONSULTA_OSCURO = "(prefers-color-scheme: dark)";

function suscribirTema(avisar: () => void) {
  const mq = window.matchMedia(CONSULTA_OSCURO);
  mq.addEventListener("change", avisar);
  return () => mq.removeEventListener("change", avisar);
}

function temaActual() {
  return window.matchMedia(CONSULTA_OSCURO).matches ? "oscuro" : "claro";
}

/**
 * ApexCharts necesita colores reales (calcula el tono del hover), no
 * var(--peso). Se toman de las variables CSS del tema activo; el respaldo cubre
 * el caso de que la hoja de estilos todavía no esté aplicada.
 */
function leerToken(nombre: string, respaldo: string) {
  const valor = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
  return valor || respaldo;
}

/** Montos del eje sin centavos: $ 45.000 se lee; $ 45.000,00 repetido es ruido. */
function montoCorto(valor: number, moneda: "UYU" | "USD") {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(valor);
}

export default function BarrasMesGrafico({
  etiquetas,
  montos,
  moneda,
  alto,
}: {
  etiquetas: string[];
  montos: number[];
  moneda: "UYU" | "USD";
  alto: number;
}) {
  const tema = useSyncExternalStore(suscribirTema, temaActual, temaActual);
  const oscuro = tema === "oscuro";

  const opciones = useMemo<ApexOptions>(() => {
    const color =
      moneda === "UYU"
        ? leerToken("--peso", oscuro ? "#6fbee4" : "#1f6f96")
        : leerToken("--dolar", oscuro ? "#7fc895" : "#2f6e46");
    const texto = leerToken("--texto-suave", oscuro ? "#9aacb2" : "#556970");
    const grilla = leerToken("--borde", oscuro ? "#26363f" : "#d6dbd3");
    const fuente = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";

    return {
      chart: {
        type: "bar",
        fontFamily: fuente,
        toolbar: { show: false },
        zoom: { enabled: false },
        parentHeightOffset: 0,
        animations: { enabled: true, speed: 450 },
      },
      colors: [color],
      // Sólido: el 85% que trae por defecto lava el color de la moneda.
      fill: { opacity: 1 },
      plotOptions: {
        bar: {
          horizontal: true,
          // Con filas de 32px la barra queda en ~22px: debajo del tope de 24px.
          barHeight: "68%",
          // Punta redondeada y base recta.
          borderRadius: 4,
          borderRadiusApplication: "end",
        },
      },
      dataLabels: { enabled: false },
      states: {
        hover: { filter: { type: "lighten" } },
        active: { filter: { type: "none" } },
      },
      grid: {
        borderColor: grilla,
        strokeDashArray: 0,
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } },
        // Margen izquierdo para que la "M" de Mar y May no quede recortada.
        padding: { left: 14, right: 16, top: -8, bottom: 0 },
      },
      xaxis: {
        categories: etiquetas,
        tickAmount: 4,
        labels: {
          style: { colors: texto, fontSize: "11px" },
          formatter: (valor: string) => montoCorto(Number(valor), moneda),
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          minWidth: 30,
          // Un color por etiqueta: con un solo elemento, ApexCharts lo aplica a
          // algunas y deja el resto con su gris por defecto.
          style: { colors: etiquetas.map(() => texto), fontSize: "11px" },
        },
      },
      tooltip: {
        theme: oscuro ? "dark" : "light",
        marker: { show: false },
        y: {
          formatter: (valor: number) => formatMoney(valor, moneda),
          title: { formatter: () => "" },
        },
      },
    };
  }, [etiquetas, moneda, oscuro]);

  const serie = useMemo(
    () => [{ name: moneda === "UYU" ? "Pesos" : "Dólares", data: montos }],
    [montos, moneda]
  );

  // key={tema}: al cambiar de tema se vuelve a montar con los colores nuevos.
  return <Chart key={tema} type="bar" options={opciones} series={serie} height={alto} />;
}
