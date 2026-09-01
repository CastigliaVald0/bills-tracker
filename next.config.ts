import type { NextConfig } from "next";

/** Cabeceras de seguridad aplicadas a toda la app. */
const securityHeaders = [
  // Evita que la app se embeba en un iframe ajeno (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Evita que el navegador adivine el tipo de contenido.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No filtrar la URL completa al navegar a sitios externos (ej. el link a BROU).
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // La app no usa ninguna de estas APIs del navegador.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // Fuerza HTTPS en visitas posteriores.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // No anunciar el framework en las respuestas.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
