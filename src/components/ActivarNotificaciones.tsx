"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { soportaPush, suscribirEsteDispositivo } from "@/lib/push-cliente";

/** Marca en el dispositivo de que ya se le preguntó por el permiso. */
const CLAVE_YA_PEDIDO = "bt-permiso-notificaciones-pedido";

/** Una sola vez por carga de la app, aunque se navegue entre páginas. */
let yaSeRevisoEnEstaCarga = false;

/**
 * Las notificaciones vienen activadas por defecto, pero el navegador exige que
 * el usuario acepte el permiso en cada dispositivo. Este componente, sin nada
 * visible, lo pide al entrar a la app:
 *
 * - Solo si el usuario no desactivó el aviso en Mi cuenta.
 * - Una única vez por dispositivo: si lo rechaza o cierra el cartel, no se le
 *   vuelve a insistir (lo puede activar después desde Mi cuenta).
 * - Si el permiso ya estaba concedido, suscribe el dispositivo sin preguntar.
 *
 * En Mi cuenta no corre: ahí el interruptor maneja todo y se pisarían.
 */
export function ActivarNotificaciones() {
  const pathname = usePathname();
  const enMiCuenta = pathname.startsWith("/account");

  useEffect(() => {
    if (enMiCuenta || yaSeRevisoEnEstaCarga || !soportaPush()) return;
    yaSeRevisoEnEstaCarga = true;

    (async () => {
      try {
        const res = await fetch("/api/account/notifications");
        if (!res.ok) return;
        const prefs: { monthlyPush: boolean; pushConfigured: boolean; vapidPublicKey: string | null } =
          await res.json();
        if (!prefs.monthlyPush || !prefs.pushConfigured || !prefs.vapidPublicKey) return;

        if (Notification.permission === "denied") return;

        if (Notification.permission === "default") {
          let yaPedido = false;
          try {
            yaPedido = localStorage.getItem(CLAVE_YA_PEDIDO) === "1";
          } catch {
            // Sin acceso al almacenamiento (modo privado): se pregunta igual.
          }
          if (yaPedido) return;
          try {
            localStorage.setItem(CLAVE_YA_PEDIDO, "1");
          } catch {}

          if ((await Notification.requestPermission()) !== "granted") return;
        }

        await suscribirEsteDispositivo(prefs.vapidPublicKey);
      } catch (error) {
        // No es crítico: el usuario puede activarlo desde Mi cuenta.
        console.warn("[notificaciones] no se pudo activar en este dispositivo:", error);
      }
    })();
  }, [enMiCuenta]);

  return null;
}
