"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Aceptar o rechazar la invitación a un grupo. Al aceptar, se entra directo. */
export function ResponderInvitacion({ grupoId }: { grupoId: string }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);

  async function responder(accion: "aceptar" | "rechazar") {
    if (ocupado) return;
    setOcupado(true);
    try {
      const res = await fetch(`/api/grupos/${grupoId}/invitacion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion }),
      });
      if (res.ok && accion === "aceptar") router.push(`/grupos/${grupoId}`);
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  return (
    <span className="flex shrink-0 gap-2">
      <button type="button" disabled={ocupado} onClick={() => responder("rechazar")} className="boton-mini">
        Rechazar
      </button>
      <button type="button" disabled={ocupado} onClick={() => responder("aceptar")} className="boton py-1.5">
        Aceptar
      </button>
    </span>
  );
}
