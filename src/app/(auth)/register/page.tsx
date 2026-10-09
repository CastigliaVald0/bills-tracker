"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { normalizarCodigo } from "@/lib/amigos";
import Link from "next/link";
import { CampoContrasena } from "@/components/CampoContrasena";

function RegisterPageForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Si llegó por un enlace de invitación, al terminar vuelve ahí para
  // confirmar la amistad en vez de caer en el inicio.
  const invitacion = normalizarCodigo(useSearchParams().get("invitacion") ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: name || undefined }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo crear la cuenta");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (result?.error) {
      setError("Cuenta creada, pero no se pudo iniciar sesión. Probá ingresar manualmente.");
      return;
    }

    router.push(invitacion ? `/invitacion/${invitacion}` : "/dashboard");
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-lg font-semibold tracking-tight text-texto">Crear cuenta</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nombre" className="rotulo">Nombre</label>
          <input
            id="nombre"
            type="text"
            autoComplete="name"
            placeholder="Opcional"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="campo"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="rotulo">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="vos@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="campo"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="rotulo">Contraseña</label>
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

        {error && <p className="text-sm text-alerta">{error}</p>}

        <button type="submit" disabled={loading} className="boton mt-1 w-full">
          {loading ? "Creando..." : "Crear cuenta"}
        </button>
      </form>

      <p className="mt-6 border-t border-borde pt-4 text-sm text-suave">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-medium text-texto underline decoration-peso decoration-2 underline-offset-4">
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}

/**
 * `useSearchParams` obliga a un límite de Suspense: sin él, esta página
 * —que se prerenderiza— falla al compilar.
 */
export default function RegisterPage() {
  return (
    <Suspense fallback={<p className="text-sm text-suave">Cargando...</p>}>
      <RegisterPageForm />
    </Suspense>
  );
}
