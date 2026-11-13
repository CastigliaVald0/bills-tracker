"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/format";
import { EVENTO_TICKET_CERRADO } from "@/components/TicketGasto";

/** "$ 49.411,50" → 49411.5. Solo para calcular cuánto se sumó. */
function aNumero(texto: string) {
  const limpio = texto.replace(/[^\d,-]/g, "").replace(",", ".");
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

const ES_DIGITO = /\d/;
const DIGITOS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * Un monto de la pizarra que, cuando cambia, rueda hasta su valor nuevo: cada
 * dígito gira como una rueda, de derecha a izquierda, y arriba aparece por un
 * momento lo que se sumó. Es la confirmación de que el gasto que acabás de
 * cargar quedó contado, y en qué moneda.
 *
 * Recuerda el último valor que mostró (por sesión), así también rueda al
 * volver al inicio después de cargar un gasto desde otra pantalla. La primera
 * vez que se ve, o si el teléfono pide menos movimiento, aparece quieto.
 */
export function CifraRodante({
  texto,
  moneda,
  clave,
  className = "",
}: {
  texto: string;
  moneda: "UYU" | "USD";
  /** Identifica esta cifra entre visitas: la pizarra, el período y la moneda. */
  clave: string;
  className?: string;
}) {
  // `desde` es el valor del que arranca la animación; null cuando está quieta.
  const [desde, setDesde] = useState<string | null>(null);
  const [rodando, setRodando] = useState(false);
  const ultimo = useRef<string | null>(null);

  useEffect(() => {
    const llave = `bt-cifra:${clave}`;
    let anterior = ultimo.current;
    if (anterior === null) {
      try {
        anterior = sessionStorage.getItem(llave);
      } catch {
        anterior = null;
      }
    }
    ultimo.current = texto;
    try {
      sessionStorage.setItem(llave, texto);
    } catch {
      // Sin almacenamiento la cifra simplemente no rueda al volver.
    }

    if (!anterior || anterior === texto) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Primero se dibujan las ruedas en el valor viejo; en el cuadro siguiente
    // se les da el valor nuevo y la transición las hace girar.
    let cuadro = 0;
    let fin: ReturnType<typeof setTimeout> | undefined;
    function rodar() {
      cuadro = requestAnimationFrame(() => {
        setDesde(anterior);
        setRodando(false);
        cuadro = requestAnimationFrame(() => {
          cuadro = requestAnimationFrame(() => setRodando(true));
        });
      });
      fin = setTimeout(() => {
        setDesde(null);
        setRodando(false);
      }, 2400);
    }

    // Si el ticket del gasto está a la vista, la página está difuminada
    // detrás: se espera a que se guarde para que el giro se vea. Por las
    // dudas, a los 6 segundos rueda igual.
    const hayTicket = document.querySelector(".ticket-pop") !== null;
    let espera: ReturnType<typeof setTimeout> | undefined;
    const alCerrarTicket = () => {
      clearTimeout(espera);
      window.removeEventListener(EVENTO_TICKET_CERRADO, alCerrarTicket);
      rodar();
    };
    if (hayTicket) {
      window.addEventListener(EVENTO_TICKET_CERRADO, alCerrarTicket);
      espera = setTimeout(alCerrarTicket, 6000);
    } else {
      rodar();
    }

    return () => {
      cancelAnimationFrame(cuadro);
      clearTimeout(fin);
      clearTimeout(espera);
      window.removeEventListener(EVENTO_TICKET_CERRADO, alCerrarTicket);
    };
  }, [texto, clave]);

  const animando = desde !== null;
  // Mientras no gira, las ruedas muestran el valor viejo; al girar, el nuevo.
  const mostrado = animando && !rodando ? desde : texto;
  const largo = texto.length;

  const antes = animando ? aNumero(desde) : null;
  const ahora = aNumero(texto);
  const suma = antes !== null && ahora !== null ? ahora - antes : 0;

  return (
    <span className={`rodante ${animando && rodando ? "rodando" : ""} ${className}`}>
      <span className="sr-only">{texto}</span>
      <span aria-hidden className="inline-flex">
        {texto.split("").map((caracter, i) => {
          // Se alinea por la derecha: si el número creció un dígito, el nuevo
          // aparece a la izquierda y los demás giran en su lugar.
          const distancia = largo - 1 - i;
          const viejo = mostrado[mostrado.length - 1 - distancia];
          if (!ES_DIGITO.test(caracter)) {
            return (
              <span key={i} className="rodante-caja">
                {caracter === " " ? " " : caracter}
              </span>
            );
          }
          const valor = Number(viejo !== undefined && ES_DIGITO.test(viejo) ? viejo : animando ? "0" : caracter);
          return (
            <span key={i} className="rodante-caja">
              <span
                className="rodante-rueda"
                style={
                  {
                    "--i": distancia,
                    transform: `translateY(${-valor * 1.1}em)`,
                  } as React.CSSProperties
                }
              >
                {DIGITOS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </span>
            </span>
          );
        })}
      </span>
      {animando && suma > 0 && (
        <span aria-hidden className="rodante-suma">
          + {formatMoney(suma, moneda)}
        </span>
      )}
    </span>
  );
}
