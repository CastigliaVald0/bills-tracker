"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CampoContrasena } from "@/components/CampoContrasena";

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("La confirmación no coincide con la nueva contraseña");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo cambiar la contraseña");
      return;
    }

    setDone(true);
  }

  if (!token) {
    return (
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-texto">Link inválido</h1>
        <p className="mt-4 text-sm text-suave">
          Este link no tiene el código de recuperación. Pedí uno nuevo desde la pantalla de inicio de sesión.
        </p>
        <p className="mt-6 border-t border-borde pt-4 text-sm text-suave">
          <Link href="/forgot-password" className="font-medium text-texto underline decoration-peso decoration-2 underline-offset-4">
            Pedir un link nuevo
          </Link>
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-texto">Contraseña actualizada</h1>
        <p className="mt-4 text-sm text-suave">Ya podés entrar con tu contraseña nueva.</p>
        <button onClick={() => router.push("/login")} className="boton mt-6 w-full">
          Iniciar sesión
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-semibold tracking-tight text-texto">Elegí una contraseña nueva</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="rotulo">Nueva contraseña</label>
          <CampoContrasena
            id="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={setPassword}
            required
            minLength={8}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirm" className="rotulo">Repetir contraseña</label>
          <CampoContrasena
            id="confirm"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            required
            minLength={8}
          />
        </div>

        {error && <p className="text-sm text-alerta">{error}</p>}

        <button type="submit" disabled={loading} className="boton mt-1 w-full">
          {loading ? "Guardando..." : "Guardar contraseña"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-suave">Cargando...</p>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
