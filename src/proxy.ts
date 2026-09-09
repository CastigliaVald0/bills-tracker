import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isPublicPath = PUBLIC_PATHS.includes(req.nextUrl.pathname);

  if (!isLoggedIn && !isPublicPath) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isPublicPath) {
    const dashboardUrl = new URL("/dashboard", req.nextUrl.origin);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Los íconos y el manifiesto quedan fuera del control de sesión: el navegador
  // y el sistema operativo los piden sin cookies y antes de cualquier login,
  // así que si pasaran por acá se irían redirigidos a /login y la pestaña
  // quedaría sin logo, o el celular sin ícono al agregarlo al inicio.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|icon-|apple-icon|manifest.webmanifest).*)",
  ],
};
