import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizarCodigo } from "@/lib/amigos";
import { enviarSolicitud, responderSolicitud, borrarVinculo } from "@/lib/amigos-db";

/** Un puñado de solicitudes por hora alcanza para cualquier uso real. */
const LIMITE = 20;
const VENTANA = 60 * 60;

const crearSchema = z.union([
  z.object({ codigo: z.string().min(1).max(40) }),
  z.object({ usuarioId: z.string().min(1).max(60) }),
]);

const responderSchema = z.object({
  solicitudId: z.string().min(1).max(60),
  accion: z.enum(["aceptar", "rechazar"]),
});

const MENSAJES: Record<string, string> = {
  "uno-mismo": "No podés agregarte a vos mismo.",
  "ya-amigos": "Ya son amigos.",
  "ya-pendiente": "Ya le mandaste una solicitud y todavía no respondió.",
  "rechazada-antes": "Esa persona no aceptó tu solicitud anterior.",
  "no-existe": "No encontramos a nadie con ese código.",
};

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = crearSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const limite = await checkRateLimit(`amigos:${userId}`, LIMITE, VENTANA);
  if (!limite.allowed) {
    return NextResponse.json(
      { error: "Mandaste muchas solicitudes seguidas. Probá más tarde." },
      { status: 429, headers: { "Retry-After": String(limite.retryAfterSeconds) } }
    );
  }

  // Por código o por id, según de dónde venga. El id solo llega desde la
  // búsqueda por nombre, que ya filtró a quien no quiere ser encontrado.
  let paraId: string | null = null;
  if ("codigo" in parsed.data) {
    const codigo = normalizarCodigo(parsed.data.codigo);
    if (!codigo) {
      return NextResponse.json({ error: "Ese código no tiene el formato correcto." }, { status: 400 });
    }
    const destino = await prisma.user.findUnique({ where: { codigoAmigo: codigo }, select: { id: true } });
    paraId = destino?.id ?? null;
  } else {
    const destino = await prisma.user.findFirst({
      where: { id: parsed.data.usuarioId, buscablePorNombre: true },
      select: { id: true },
    });
    paraId = destino?.id ?? null;
  }

  if (!paraId) return NextResponse.json({ error: MENSAJES["no-existe"] }, { status: 404 });

  const resultado = await enviarSolicitud(userId, paraId);
  if (!resultado.ok) {
    return NextResponse.json({ error: MENSAJES[resultado.motivo] ?? "No se pudo enviar." }, { status: 409 });
  }

  return NextResponse.json({ estado: resultado.estado });
}

export async function PATCH(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = responderSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const hecho = await responderSolicitud(
    userId,
    parsed.data.solicitudId,
    parsed.data.accion === "aceptar"
  );
  if (!hecho) return NextResponse.json({ error: "Esa solicitud ya no está pendiente." }, { status: 409 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = z.object({ usuarioId: z.string().min(1).max(60) }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const hecho = await borrarVinculo(userId, parsed.data.usuarioId);
  if (!hecho) return NextResponse.json({ error: "No había nada que borrar." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
