import type { Metadata, Viewport } from "next";
import { Familjen_Grotesk, Azeret_Mono, Bricolage_Grotesque } from "next/font/google";
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
const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
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
      className={`${familjenGrotesk.variable} ${azeretMono.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
