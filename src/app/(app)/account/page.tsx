"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { CampoContrasena } from "@/components/CampoContrasena";

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
    <div className="flex flex-col gap-8">
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
