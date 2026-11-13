"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/format";
import { IconoTicket, IconoCalendario } from "@/components/navegacion";

/** Lo que muestra el ticket de un gasto recién cargado. */
export type DatosTicket = {
  tipo: "comun" | "fijo";
  /** La descripción, o el nombre de la categoría si no tiene. */
  titulo: string;
  categoria: string;
  emoji: string | null;
  monto: number;
  moneda: "UYU" | "USD";
  /** "13 nov" para un común; "Día 22" para un fijo. */
  cuando: string;
  /** Qué pasa con este gasto, en una línea: "Suma a noviembre". */
  pie: string;
  /** La dirección que borra lo recién creado (DELETE), para "Deshacer". */
  deshacer: string | null;
};

/** Avisa que el ticket se guardó: la pizarra espera esto para rodar (ver
    CifraRodante), así su animación no queda escondida detrás del velo. */
export const EVENTO_TICKET_CERRADO = "ticket-cerrado";

/** Cuánto queda a la vista antes de volver a entrar en la ranura. Mientras
    se lo toca o se lo apunta, la cuenta se frena. */
const DURACION = 1800;
/** Lo que dura la salida (ver .ticket-saliendo en globals.css). */
const SALIDA = 460;

/**
 * El ticket de un gasto recién cargado. Sale de una ranura apenas se guarda,
 * como de una caja registradora: qué fue, cuánto, en qué moneda y qué pasa
 * con él. Aparece en el centro, con la página de atrás difuminada. Debajo,
 * "Deshacer" (por si te equivocaste) y "Cargar otro" (para cargar varios
 * seguidos). A los dos segundos vuelve a entrar, salvo que lo estés tocando;
 * tocar el fondo o Escape lo guarda antes.
 *
 * Reemplaza al aviso de texto "Gasto cargado": dice lo mismo y además deja
 * ver de un vistazo que el monto y la moneda quedaron bien.
 */
export function TicketGasto({
  datos,
  alTerminar,
  alDeshacer,
  alCargarOtro,
}: {
  datos: DatosTicket;
  alTerminar: () => void;
  /** Borra el gasto recién creado. */
  alDeshacer: () => void;
  /** Abre la ventana de nuevo gasto otra vez. */
  alCargarOtro: () => void;
}) {
  const [saliendo, setSaliendo] = useState(false);
  const salida = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cuenta = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cerrar = useCallback(() => {
    if (salida.current) return;
    setSaliendo(true);
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    salida.current = setTimeout(() => {
      window.dispatchEvent(new Event(EVENTO_TICKET_CERRADO));
      alTerminar();
    }, reducido ? 0 : SALIDA);
  }, [alTerminar]);

  // La cuenta regresiva se frena mientras se toca o se apunta el ticket,
  // para que dé tiempo de apretar "Deshacer", y sigue al soltar.
  const frenar = useCallback(() => {
    if (cuenta.current) clearTimeout(cuenta.current);
    cuenta.current = null;
  }, []);
  const seguir = useCallback(() => {
    if (cuenta.current || salida.current) return;
    cuenta.current = setTimeout(cerrar, 1400);
  }, [cerrar]);

  useEffect(() => {
    cuenta.current = setTimeout(cerrar, DURACION);
    // Escape también lo guarda, como cualquier ventana de la app.
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => {
      if (cuenta.current) clearTimeout(cuenta.current);
      window.removeEventListener("keydown", alTeclear);
      if (salida.current) clearTimeout(salida.current);
    };
  }, [cerrar]);

  const Icono = datos.tipo === "fijo" ? IconoCalendario : IconoTicket;
  const colorMonto = datos.moneda === "UYU" ? "text-peso-tinta" : "text-dolar-tinta";

  return (
    <div className={saliendo ? "ticket-saliendo" : ""}>
      {/* La página de atrás, difuminada. Tocarla cierra el ticket. */}
      <div className="ticket-velo" aria-hidden onClick={cerrar} />
      <div
        className="ticket-pop"
        onPointerEnter={frenar}
        onPointerDown={frenar}
        onPointerLeave={seguir}
        onFocus={frenar}
        onBlur={seguir}
      >
        <div className="ticket-ranura" aria-hidden />
        <div className="ticket-boca">
          <div className="ticket-papel" aria-hidden>
            <span className="ticket-renglon ticket-tenue" aria-hidden>
              <span className="font-semibold">{datos.tipo === "fijo" ? "Gasto fijo creado" : "Gasto cargado"}</span>
              <span>{datos.cuando}</span>
            </span>

            <span className="ticket-renglon" aria-hidden>
              <span className="min-w-0 truncate text-[15px] font-bold">
                {datos.emoji && <span className="mr-1.5">{datos.emoji}</span>}
                {datos.titulo}
              </span>
              {datos.titulo !== datos.categoria && <span className="ticket-tenue shrink-0">{datos.categoria}</span>}
            </span>

            <span className="ticket-renglon ticket-total" aria-hidden>
              <span>Total</span>
              <span className={`monto ${colorMonto}`}>{formatMoney(datos.monto, datos.moneda)}</span>
            </span>

            <span className="ticket-pie" aria-hidden>
              <Icono className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">{datos.pie}</span>
            </span>
          </div>
        </div>
        <div className="ticket-acciones">
          {datos.deshacer && (
            <button
              type="button"
              onClick={() => {
                frenar();
                alDeshacer();
              }}
              className="boton-linea"
            >
              Deshacer
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              frenar();
              alCargarOtro();
            }}
            className={`boton ${datos.deshacer ? "" : "col-span-2"}`}
          >
            Cargar otro
          </button>
        </div>
      </div>
      {/* Para el lector de pantalla, una sola frase. */}
      <p role="status" className="sr-only">
        {datos.tipo === "fijo" ? "Gasto fijo creado" : "Gasto cargado"}: {datos.titulo},{" "}
        {formatMoney(datos.monto, datos.moneda)}. {datos.pie}.
      </p>
    </div>
  );
}
