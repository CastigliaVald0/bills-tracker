import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Azeret_Mono } from "next/font/google";
import "./globals.css";

// Una sola letra, geométrica y redonda, para la interfaz, los títulos y las
// cifras (tiene números tabulares). Es variable: se carga entera en vez de
// pedir pesos sueltos, que rompía el build de producción de Turbopack
// ("next/font/google queries have exactly one entry").
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
});

// Solo para las casillas del código de amigo, que se dicta letra por letra.
const azeretMono = Azeret_Mono({
  variable: "--font-num",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "Billions Tracker",
  description: "Control de gastos mensuales en pesos y dólares",
};

// La app es siempre oscura: la barra del navegador y los controles nativos
// acompañan, sin importar el tema del dispositivo.
export const viewport: Viewport = {
  themeColor: "#3a325e",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${jakarta.variable} ${azeretMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="ventana flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
