import type { Metadata, Viewport } from "next";
import { Familjen_Grotesk, Azeret_Mono, Bricolage_Grotesque, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const familjenGrotesk = Familjen_Grotesk({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const azeretMono = Azeret_Mono({
  variable: "--font-num",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

// Solo para los títulos de página y de sección: una voz con más carácter que
// la letra de todos los días, usada poco para que no canse.
// Es una fuente variable: se carga entera (todos los pesos en un archivo) en
// vez de pedir pesos sueltos. Pedir pesos sueltos rompía el build de
// producción de Turbopack ("next/font/google queries have exactly one entry").
const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

// La letra de la placa de los títulos sueltos: condensada y en negrita, como
// el nombre en la espalda de una camiseta de fútbol. Pesos fijos (no es una
// fuente variable), así que no tiene el problema de build de la de arriba.
const barlowCondensed = Barlow_Condensed({
  variable: "--font-placa",
  subsets: ["latin"],
  weight: ["700", "800"],
});

export const metadata: Metadata = {
  title: "Billions Tracker",
  description: "Control de gastos mensuales en pesos y dólares",
};

// La app es siempre oscura: la barra del navegador y los controles nativos
// acompañan, sin importar el tema del dispositivo.
export const viewport: Viewport = {
  themeColor: "#0b1318",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${familjenGrotesk.variable} ${azeretMono.variable} ${bricolage.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
