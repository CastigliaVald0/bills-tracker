import webpush from "web-push";
import { prisma } from "@/lib/prisma";

/**
 * Notificaciones push (Web Push con claves VAPID). Se configura con variables de
 * entorno; sin ellas la app funciona igual y la opción aparece deshabilitada.
 */

export type AvisoPush = {
  title: string;
  body: string;
  /** Página que se abre al tocar la notificación. */
  url: string;
  /** Mismo tag = reemplaza al aviso anterior en vez de apilarse. */
  tag?: string;
};

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT
  );
}

let configurado = false;

function configurar(): boolean {
  if (configurado) return true;
  if (!isPushConfigured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configurado = true;
  return true;
}

/**
 * Solo se aceptan dispositivos de los servicios de push reales. Sin esta lista,
 * cualquiera podría registrar una dirección propia y hacer que el servidor le
 * mande pedidos todos los meses.
 */
const SERVICIOS_DE_PUSH = [
  "fcm.googleapis.com", // Chrome, Edge nuevo, Android, Samsung Internet
  "push.services.mozilla.com", // Firefox
  "push.apple.com", // Safari e iPhone (web.push.apple.com)
  "notify.windows.com", // Edge viejo
];

export function endpointPermitido(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }

  // En desarrollo se permite un servidor local para poder probar el envío.
  if (
    process.env.NODE_ENV !== "production" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1")
  ) {
    return true;
  }

  if (url.protocol !== "https:") return false;
  return SERVICIOS_DE_PUSH.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
}

/**
 * Manda el aviso a todos los dispositivos del usuario. Los dispositivos que el
 * servicio de push da por muertos (404/410: se desinstaló la app, se revocó el
 * permiso) se borran para no volver a intentarlo.
 */
export async function enviarPushAUsuario(userId: string, aviso: AvisoPush) {
  const resultado = { enviados: 0, fallidos: 0, borrados: 0 };

  if (!configurar()) {
    console.error("[push] faltan las claves VAPID: no se mandó la notificación");
    return resultado;
  }

  const dispositivos = await prisma.pushSubscription.findMany({ where: { userId } });
  const payload = JSON.stringify(aviso);

  await Promise.all(
    dispositivos.map(async (d) => {
      try {
        await webpush.sendNotification(
          { endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
          payload,
          // Si el celular está apagado, el servicio la guarda hasta 3 días.
          { TTL: 60 * 60 * 24 * 3 }
        );
        resultado.enviados++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.deleteMany({ where: { id: d.id } });
          resultado.borrados++;
        } else {
          resultado.fallidos++;
          console.error("[push] falló el envío:", status ?? error);
        }
      }
    })
  );

  return resultado;
}
