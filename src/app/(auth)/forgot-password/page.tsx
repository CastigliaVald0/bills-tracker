"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo procesar el pedido");
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-texto">Revisá tu correo</h1>
        <p className="mt-4 text-sm text-suave">
          Si <span className="text-texto">{email}</span> tiene una cuenta, te llegó un link para elegir una
          contraseña nueva. Vence en una hora.
        </p>
        <p className="mt-4 text-sm text-suave">
          ¿No te llegó? Fijate en el spam, o{" "}
          <button
            type="button"
            onClick={() => setSent(false)}
            className="font-medium text-texto underline decoration-peso decoration-2 underline-offset-4"
          >
            probá de nuevo
          </button>
          .
        </p>
        <p className="mt-6 border-t border-borde pt-4 text-sm text-suave">
          <Link href="/login" className="font-medium text-texto underline decoration-peso decoration-2 underline-offset-4">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-semibold tracking-tight text-texto">Recuperar contraseña</h1>
      <p className="mt-2 text-sm text-suave">
        Te mandamos un link a tu correo para que elijas una nueva.
      </p>

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

        {error && <p className="text-sm text-alerta">{error}</p>}

        <button type="submit" disabled={loading} className="boton mt-1 w-full">
          {loading ? "Enviando..." : "Enviarme el link"}
        </button>
      </form>

      <p className="mt-6 border-t border-borde pt-4 text-sm text-suave">
        <Link href="/login" className="font-medium text-texto underline decoration-peso decoration-2 underline-offset-4">
          Volver al inicio de sesión
        </Link>
      </p>
    </div>
  );
}
