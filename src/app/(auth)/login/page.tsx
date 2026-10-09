"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { rutaInternaSegura } from "@/lib/volver-a";
import Link from "next/link";
import { CampoContrasena } from "@/components/CampoContrasena";

function LoginPageForm() {
  const router = useRouter();
  // A dónde volver después de entrar: lo usa el enlace de invitación para que
  // no te deje en el inicio y tengas que buscar el mensaje de nuevo.
  const destino = rutaInternaSegura(useSearchParams().get("volverA"), "/dashboard");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(
        result.code === "rate_limited"
          ? "Demasiados intentos fallidos. Esperá unos minutos antes de volver a probar."
          : "Email o contraseña incorrectos"
      );
      return;
    }

    router.push(destino);
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-lg font-semibold tracking-tight text-texto">Iniciar sesión</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
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
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="password" className="rotulo">Contraseña</label>
            <Link href="/forgot-password" className="text-xs text-suave hover:text-texto">
              ¿La olvidaste?
            </Link>
          </div>
          <CampoContrasena
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            required
          />
        </div>

        {error && <p className="text-sm text-alerta">{error}</p>}

        <button type="submit" disabled={loading} className="boton mt-1 w-full">
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

      <p className="mt-6 border-t border-borde pt-4 text-sm text-suave">
        ¿No tenés cuenta?{" "}
        <Link href="/register" className="font-medium text-texto underline decoration-peso decoration-2 underline-offset-4">
          Registrate
        </Link>
      </p>
    </div>
  );
}

/**
 * `useSearchParams` obliga a un límite de Suspense: sin él, esta página
 * —que se prerenderiza— falla al compilar.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-sm text-suave">Cargando...</p>}>
      <LoginPageForm />
    </Suspense>
  );
}
