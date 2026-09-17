import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { endpointPermitido } from "@/lib/push";

/** Tope de dispositivos por usuario: alcanza de sobra y evita acumular basura. */
const MAX_DISPOSITIVOS = 10;

const subscribeSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});

/** Registra este dispositivo para recibir notificaciones. */
export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = subscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
  }
  const { endpoint, keys } = parsed.data;

  if (!endpointPermitido(endpoint)) {
    return NextResponse.json({ error: "Servicio de notificaciones no admitido" }, { status: 400 });
  }

  const existente = await prisma.pushSubscription.findUnique({ where: { endpoint } });
  if (!existente) {
    const cantidad = await prisma.pushSubscription.count({ where: { userId } });
    if (cantidad >= MAX_DISPOSITIVOS) {
      return NextResponse.json(
        { error: "Llegaste al máximo de dispositivos con notificaciones" },
        { status: 400 }
      );
    }
  }

  // Un mismo navegador puede pasar de una cuenta a otra: el dispositivo queda
  // asociado a quien lo registró último.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

const unsubscribeSchema = z.object({ endpoint: z.string().max(1000) });

/** Da de baja este dispositivo. */
export async function DELETE(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = unsubscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  // Filtrado por usuario: nadie puede dar de baja el dispositivo de otro.
  await prisma.pushSubscription.deleteMany({ where: { endpoint: parsed.data.endpoint, userId } });

  return NextResponse.json({ ok: true });
}
