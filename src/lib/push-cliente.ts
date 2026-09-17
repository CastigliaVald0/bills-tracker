/**
 * Notificaciones push del lado del navegador. Lo usan Mi cuenta (el interruptor)
 * y el pedido automático de permiso al entrar a la app.
 */

export function soportaPush(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** La clave pública VAPID viene en base64url; el navegador la pide en bytes. */
function claveABytes(base64url: string) {
  const relleno = "=".repeat((4 - (base64url.length % 4)) % 4);
  const binario = atob((base64url + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(binario.length));
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

/**
 * Registra el service worker, suscribe este dispositivo y lo guarda en el
 * servidor. Necesita el permiso de notificaciones ya concedido. Si el
 * dispositivo ya estaba suscripto, reutiliza esa suscripción y la vuelve a
 * mandar (el servidor la actualiza sin duplicarla).
 */
export async function suscribirEsteDispositivo(vapidPublicKey: string) {
  const registro = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  await navigator.serviceWorker.ready;

  const suscripcion =
    (await registro.pushManager.getSubscription()) ??
    (await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: claveABytes(vapidPublicKey),
    }));

  const datos = suscripcion.toJSON();
  const res = await fetch("/api/account/notifications/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: datos.endpoint, keys: datos.keys }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "No se pudo registrar este dispositivo");
  }
}
