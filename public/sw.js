// Service worker de Billions Tracker.
//
// Solo recibe notificaciones push y abre la app al tocarlas. No guarda nada en
// caché: la app sigue funcionando exactamente igual que sin él.

self.addEventListener("push", (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch {
    datos = { body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(datos.title || "Billions Tracker", {
      body: datos.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      // Mismo tag = reemplaza al aviso anterior del mismo mes en vez de apilarse.
      tag: datos.tag || "billions-tracker",
      data: { url: datos.url || "/reports" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const destino = new URL(event.notification.data?.url || "/reports", self.location.origin);
  // Solo se abren páginas de la propia app, nunca una dirección externa.
  if (destino.origin !== self.location.origin) return;

  event.waitUntil(
    (async () => {
      // Si la app ya está abierta, se reutiliza esa ventana en lugar de abrir otra.
      const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const ventana of ventanas) {
        if (new URL(ventana.url).origin === self.location.origin && "navigate" in ventana) {
          await ventana.focus();
          return ventana.navigate(destino.href);
        }
      }
      return self.clients.openWindow(destino.href);
    })()
  );
});
