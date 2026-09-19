"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { CampoContrasena } from "@/components/CampoContrasena";
import { soportaPush, suscribirEsteDispositivo } from "@/lib/push-cliente";

export default function AccountPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [prefs, setPrefs] = useState<Preferencias | null>(null);
  // La preferencia es por usuario, pero la suscripción es por dispositivo: el
  // interruptor muestra si ESTE navegador va a recibir la notificación.
  const [pushEnEsteDispositivo, setPushEnEsteDispositivo] = useState(false);
  const [guardandoNotif, setGuardandoNotif] = useState<"mail" | "push" | null>(null);
  const [avisoNotif, setAvisoNotif] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const res = await fetch("/api/account/notifications");
      if (!res.ok) return;
      const datos: Preferencias = await res.json();

      let suscripto = false;
      if ("serviceWorker" in navigator) {
        const registro = await navigator.serviceWorker.getRegistration("/");
        suscripto = Boolean(await registro?.pushManager?.getSubscription());
      }

      if (cancelado) return;
      setPrefs(datos);
      setPushEnEsteDispositivo(datos.monthlyPush && suscripto);
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  async function guardarPreferencia(cambio: { monthlyEmail?: boolean; monthlyPush?: boolean }) {
    const res = await fetch("/api/account/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cambio),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "No se pudo guardar la preferencia");
    }
    setPrefs((p) => (p ? { ...p, ...cambio } : p));
  }

  async function cambiarMail(activo: boolean) {
    setGuardandoNotif("mail");
    setAvisoNotif(null);
    try {
      await guardarPreferencia({ monthlyEmail: activo });
    } catch (error) {
      setAvisoNotif({ tipo: "error", texto: mensajeDeError(error) });
    }
    setGuardandoNotif(null);
  }

  async function cambiarPush(activo: boolean) {
    setGuardandoNotif("push");
    setAvisoNotif(null);
    try {
      if (activo) {
        if (!soportaPush()) {
          throw new Error(
            "Este navegador no admite notificaciones. En iPhone, primero agregá la app a la pantalla de inicio."
          );
        }
        if (!prefs?.vapidPublicKey) throw new Error("Las notificaciones todavía no están configuradas.");

        const permiso = await Notification.requestPermission();
        if (permiso !== "granted") {
          throw new Error(
            "No se dio permiso para mostrar notificaciones. Podés habilitarlo desde la configuración del navegador."
          );
        }

        await suscribirEsteDispositivo(prefs.vapidPublicKey);

        await guardarPreferencia({ monthlyPush: true });
        setPushEnEsteDispositivo(true);
      } else {
        const registro = await navigator.serviceWorker?.getRegistration("/");
        const suscripcion = await registro?.pushManager.getSubscription();
        if (suscripcion) {
          await fetch("/api/account/notifications/push", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: suscripcion.endpoint }),
          });
          await suscripcion.unsubscribe();
        }
        await guardarPreferencia({ monthlyPush: false });
        setPushEnEsteDispositivo(false);
      }
    } catch (error) {
      setAvisoNotif({ tipo: "error", texto: mensajeDeError(error) });
    }
    setGuardandoNotif(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("La confirmación no coincide con la nueva contraseña");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/account/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo cambiar la contraseña");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccess(true);
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setDeleteError(null);
    setDeleteLoading(true);

    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: deletePassword }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDeleteError(data.error ?? "No se pudo eliminar la cuenta");
      setDeleteLoading(false);
      return;
    }

    await signOut({ callbackUrl: "/login" });
  }

  return (
    // Las tarjetas son angostas (max-w-sm): se centra la columna entera para que en
    // PC no queden pegadas a la izquierda. En celular la pantalla ya es más angosta.
    <div className="mx-auto flex w-full max-w-sm flex-col gap-8">
      <header>
        <p className="rotulo">Acceso y datos</p>
        <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-texto">Mi cuenta</h1>
      </header>

      <section>
        <h2 className="rotulo mb-3">Cambiar contraseña</h2>
        <form onSubmit={handleSubmit} className="tarjeta flex max-w-sm flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pass-actual" className="rotulo">Contraseña actual</label>
            <CampoContrasena
              id="pass-actual"
              autoComplete="current-password"
              value={currentPassword}
              onChange={setCurrentPassword}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="pass-nueva" className="rotulo">Nueva contraseña</label>
            <CampoContrasena
              id="pass-nueva"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              value={newPassword}
              onChange={setNewPassword}
              required
              minLength={8}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="pass-confirmar" className="rotulo">Repetir nueva contraseña</label>
            <CampoContrasena
              id="pass-confirmar"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              required
              minLength={8}
            />
          </div>

          {error && <p className="text-sm text-alerta">{error}</p>}
          {success && <p className="text-sm text-ok">Contraseña actualizada.</p>}

          <div className="flex justify-end border-t border-borde pt-4">
            <button type="submit" disabled={loading} className="boton">
              {loading ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="rotulo mb-3">Notificaciones</h2>
        <div className="tarjeta flex max-w-sm flex-col">
          <div className="flex items-start justify-between gap-4 p-4 sm:p-5">
            <div className="min-w-0">
              <label htmlFor="notif-mail" className="text-sm font-medium text-texto">
                Resúmenes por mail
              </label>
              <p className="mt-1 text-xs leading-relaxed text-suave">
                {prefs && !prefs.mailConfigured
                  ? "No disponible: el envío de mails no está configurado."
                  : `El día 1 de cada mes te llega${prefs ? ` a ${prefs.email}` : ""} lo que gastaste el mes anterior, y el 1 de enero, el resumen del año.`}
              </p>
            </div>
            <Interruptor
              id="notif-mail"
              activo={Boolean(prefs?.monthlyEmail)}
              disabled={!prefs || !prefs.mailConfigured || guardandoNotif !== null}
              onChange={cambiarMail}
            />
          </div>

          <div className="flex items-start justify-between gap-4 border-t border-borde p-4 sm:p-5">
            <div className="min-w-0">
              <label htmlFor="notif-push" className="text-sm font-medium text-texto">
                Aviso en este dispositivo
              </label>
              <p className="mt-1 text-xs leading-relaxed text-suave">
                {prefs && !prefs.pushConfigured
                  ? "No disponible: las notificaciones no están configuradas."
                  : "El día 1 de cada mes, una notificación con el resumen del mes, y el 1 de enero, la del año. Activalo en cada dispositivo donde la quieras."}
              </p>
            </div>
            <Interruptor
              id="notif-push"
              activo={pushEnEsteDispositivo}
              disabled={!prefs || !prefs.pushConfigured || guardandoNotif !== null}
              onChange={cambiarPush}
            />
          </div>

          {avisoNotif && (
            <p
              className={`border-t border-borde px-4 py-3 text-sm sm:px-5 ${
                avisoNotif.tipo === "ok" ? "text-ok" : "text-alerta"
              }`}
            >
              {avisoNotif.texto}
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="rotulo mb-3 text-alerta">Zona de peligro</h2>
        <div className="max-w-sm rounded-md border border-alerta/40 bg-alerta-fondo p-4 sm:p-5">
          <p className="text-sm leading-relaxed text-suave">
            Eliminar tu cuenta borra permanentemente todos tus gastos, categorías y gastos fijos.
            No se puede deshacer.
          </p>

          {!deleteOpen ? (
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="mt-4 rounded-[5px] border border-alerta/50 px-4 py-2 text-sm font-medium text-alerta transition-colors hover:bg-alerta hover:text-superficie"
            >
              Eliminar cuenta
            </button>
          ) : (
            <form onSubmit={handleDelete} className="mt-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pass-eliminar" className="rotulo">
                  Confirmá con tu contraseña
                </label>
                <CampoContrasena
                  id="pass-eliminar"
                  autoComplete="current-password"
                  value={deletePassword}
                  onChange={setDeletePassword}
                  required
                />
              </div>

              {deleteError && <p className="text-sm text-alerta">{deleteError}</p>}

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={deleteLoading}
                  className="rounded-[5px] bg-alerta px-4 py-2 text-sm font-medium text-superficie transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {deleteLoading ? "Eliminando..." : "Sí, eliminar mi cuenta"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteOpen(false);
                    setDeletePassword("");
                    setDeleteError(null);
                  }}
                  className="boton-linea"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

type Preferencias = {
  email: string;
  monthlyEmail: boolean;
  monthlyPush: boolean;
  mailConfigured: boolean;
  pushConfigured: boolean;
  vapidPublicKey: string | null;
};

function mensajeDeError(error: unknown) {
  // Los errores del navegador (DOMException) vienen en inglés y con jerga técnica.
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return "No se pudieron activar las notificaciones en este dispositivo.";
  }
  return error instanceof Error ? error.message : "Algo salió mal. Probá de nuevo.";
}

function Interruptor({
  id,
  activo,
  disabled,
  onChange,
}: {
  id: string;
  activo: boolean;
  disabled?: boolean;
  onChange: (activo: boolean) => void;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={activo}
      disabled={disabled}
      onClick={() => onChange(!activo)}
      className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        activo ? "bg-peso" : "bg-borde-fuerte"
      }`}
    >
      <span
        aria-hidden
        className={`inline-block h-5 w-5 rounded-full bg-superficie shadow-sm transition-transform ${
          activo ? "translate-x-5.5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
