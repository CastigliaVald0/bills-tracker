import type { MetadataRoute } from "next";

/**
 * Manifiesto para "agregar a la pantalla de inicio".
 *
 * En Android es esto lo que Chrome lee para el ícono y el nombre; el
 * apple-icon.png cubre iOS, que ignora el manifiesto para el ícono.
 *
 * Los íconos van a sangre completa y sin esquinas redondeadas propias porque
 * el sistema aplica su propia máscara: si vinieran ya redondeados quedarían
 * transparencias en las puntas. Por eso además se declaran "maskable" — los
 * dos puntos entran holgados en la zona segura del 80% central.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Billions Tracker",
    short_name: "Billions",
    description: "Control de gastos mensuales en pesos y dólares",
    start_url: "/dashboard",
    display: "standalone",
    lang: "es-UY",
    background_color: "#eaede7",
    theme_color: "#132430",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
