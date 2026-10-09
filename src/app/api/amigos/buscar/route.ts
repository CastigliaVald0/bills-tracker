import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { checkRateLimit } from "@/lib/rate-limit";
import { MINIMO_BUSQUEDA, MAXIMO_RESULTADOS, finalDelCodigo } from "@/lib/amigos";

/**
 * Búsqueda de personas por nombre.
 *
 * Tres resguardos para que esto no sea un listado de la base: solo aparece
 * quien lo habilitó (`buscablePorNombre`), hacen falta al menos tres letras, y
 * nunca se devuelve el correo. Lo que se muestra es el nombre y las últimas
 * letras del código, que alcanzan para confirmar contra lo que te pasaron.
 */
const LIMITE = 30;
const VENTANA = 60 * 60;

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const consulta = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (consulta.length < MINIMO_BUSQUEDA) return NextResponse.json([]);

  const limite = await checkRateLimit(`buscar-amigos:${userId}`, LIMITE, VENTANA);
  if (!limite.allowed) {
    return NextResponse.json(
      { error: "Demasiadas búsquedas seguidas. Probá más tarde." },
      { status: 429, headers: { "Retry-After": String(limite.retryAfterSeconds) } }
    );
  }

  const encontrados = await prisma.user.findMany({
    where: {
      buscablePorNombre: true,
      id: { not: userId },
      name: { contains: consulta, mode: "insensitive" },
    },
    select: { id: true, name: true, codigoAmigo: true },
    take: MAXIMO_RESULTADOS,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    encontrados.map((p) => ({ id: p.id, nombre: p.name, final: finalDelCodigo(p.codigoAmigo) }))
  );
}
