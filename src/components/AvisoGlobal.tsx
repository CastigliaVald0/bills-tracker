"use client";

import { useCallback, useEffect, useState } from "react";
import { Aviso, useAvisoTemporal } from "@/components/Aviso";
import { EVENTO_GASTO_CARGADO } from "@/components/NuevoGasto";
import { TicketGasto, type DatosTicket } from "@/components/TicketGasto";

/**
 * La confirmación de la ventana del +: la ventana se cierra al guardar, así
 * que la respuesta se muestra flotando sobre la página que haya quedado
 * abajo, en cualquier pantalla. En el celular va encima de la barra.
 *
 * Si el gasto trae sus datos, la respuesta es el ticket (ver TicketGasto);
 * si no, el aviso de texto de siempre.
 */
export function AvisoGlobal() {
  const [aviso, mostrarAviso] = useAvisoTemporal();
  // `vez` cambia con cada gasto: un ticket nuevo reemplaza al anterior y se
  // vuelve a imprimir desde el principio.
  const [ticket, setTicket] = useState<{ datos: DatosTicket; vez: number } | null>(null);

  useEffect(() => {
    function alCargar(e: Event) {
      const { mensaje, ticket: datos } = (e as CustomEvent<{ mensaje: string; ticket?: DatosTicket }>).detail;
      if (datos) setTicket((previo) => ({ datos, vez: (previo?.vez ?? 0) + 1 }));
      else mostrarAviso(mensaje);
    }
    window.addEventListener(EVENTO_GASTO_CARGADO, alCargar);
    return () => window.removeEventListener(EVENTO_GASTO_CARGADO, alCargar);
  }, [mostrarAviso]);

  const terminar = useCallback(() => setTicket(null), []);

  if (ticket) return <TicketGasto key={ticket.vez} datos={ticket.datos} alTerminar={terminar} />;
  if (!aviso) return null;
  return (
    <div className="aviso-flotante fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-full border border-borde bg-superficie-alta px-4 py-2.5 shadow-[var(--sombra-flotante)] sm:bottom-6">
      <Aviso tono="ok">{aviso}</Aviso>
    </div>
  );
}
