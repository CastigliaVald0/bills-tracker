"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Aviso, useAvisoTemporal } from "@/components/Aviso";
import { EVENTO_GASTO_CARGADO, NuevoGasto } from "@/components/NuevoGasto";
import { TicketGasto, type DatosTicket } from "@/components/TicketGasto";

type Tipo = "comun" | "fijo";

/**
 * La confirmación de la ventana del +: la ventana se cierra al guardar, así
 * que la respuesta se muestra flotando sobre la página que haya quedado
 * abajo, en cualquier pantalla. En el celular va encima de la barra.
 *
 * Si el gasto trae sus datos, la respuesta es el ticket (ver TicketGasto),
 * con "Deshacer" y "Cargar otro"; si no, el aviso de texto de siempre.
 */
export function AvisoGlobal() {
  const router = useRouter();
  const [aviso, mostrarAviso] = useAvisoTemporal();
  // `vez` cambia con cada gasto: un ticket nuevo reemplaza al anterior y se
  // vuelve a imprimir desde el principio.
  const [ticket, setTicket] = useState<{ datos: DatosTicket; tipo: Tipo; vez: number } | null>(null);
  const [cargandoOtro, setCargandoOtro] = useState(false);

  useEffect(() => {
    function alCargar(e: Event) {
      const { mensaje, ticket: datos } = (e as CustomEvent<{ mensaje: string; ticket?: DatosTicket }>).detail;
      if (datos) setTicket((previo) => ({ datos, tipo: datos.tipo, vez: (previo?.vez ?? 0) + 1 }));
      else mostrarAviso(mensaje);
    }
    window.addEventListener(EVENTO_GASTO_CARGADO, alCargar);
    return () => window.removeEventListener(EVENTO_GASTO_CARGADO, alCargar);
  }, [mostrarAviso]);

  const terminar = useCallback(() => setTicket(null), []);

  async function deshacer() {
    if (!ticket?.datos.deshacer) return;
    const { deshacer: ruta } = ticket.datos;
    const tipo = ticket.tipo;
    setTicket(null);
    const res = await fetch(ruta, { method: "DELETE" }).catch(() => null);
    // El mismo evento de siempre: las listas se recargan y aparece el aviso.
    window.dispatchEvent(
      new CustomEvent(EVENTO_GASTO_CARGADO, {
        detail: {
          tipo,
          mensaje: res?.ok ? "Gasto deshecho." : "No se pudo deshacer. Borralo desde la lista.",
        },
      })
    );
    router.refresh();
  }

  function cargarOtro() {
    setTicket(null);
    setCargandoOtro(true);
  }

  return (
    <>
      {ticket && (
        <TicketGasto
          key={ticket.vez}
          datos={ticket.datos}
          alTerminar={terminar}
          alDeshacer={deshacer}
          alCargarOtro={cargarOtro}
        />
      )}
      {!ticket && aviso && (
        <div className="aviso-flotante fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-full border border-borde bg-superficie-alta px-4 py-2.5 shadow-[var(--sombra-flotante)] sm:bottom-6">
          <Aviso tono="ok">{aviso}</Aviso>
        </div>
      )}
      {cargandoOtro && <NuevoGasto alCerrar={() => setCargandoOtro(false)} />}
    </>
  );
}
