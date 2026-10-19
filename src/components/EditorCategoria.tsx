"use client";

import { SelectorColor } from "@/components/SelectorColor";
import { SelectorEmoji } from "@/components/SelectorEmoji";
import { Insignia } from "@/components/Insignia";

/** Luminancia relativa WCAG de un color #rrggbb. */
function luminancia(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string) {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

/**
 * Con colores libres existe el riesgo de elegir uno que se confunda con el
 * fondo. El color vive en filetes y barras finas, así que se avisa cuando no
 * llega a 1,5:1 contra la superficie de las tarjetas.
 */
function avisoDeContraste(hex: string) {
  if (contraste(hex, "#15212a") < 1.5) return "Muy oscuro: casi no se va a ver sobre el fondo de la app.";
  return null;
}

/**
 * Los campos de una categoría: nombre, color y emoji, con una vista previa de
 * cómo se va a ver en las listas. Lo usan las categorías personales y las
 * secciones de un grupo, que son la categoría de los gastos del grupo; cada
 * formulario pone sus botones y su forma de guardar.
 */
export function EditorCategoria({
  id,
  etiquetaNombre = "Nombre",
  placeholder,
  nombre,
  alCambiarNombre,
  color,
  alCambiarColor,
  emoji,
  alCambiarEmoji,
  idError,
  maximoNombre,
}: {
  /** Prefijo para los id de los campos (tiene que ser único en la página). */
  id: string;
  etiquetaNombre?: string;
  placeholder: string;
  nombre: string;
  alCambiarNombre: (nombre: string) => void;
  color: string;
  alCambiarColor: (color: string) => void;
  emoji: string | null;
  alCambiarEmoji: (emoji: string | null) => void;
  idError?: string;
  maximoNombre?: number;
}) {
  const aviso = avisoDeContraste(color);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-nombre`} className="rotulo">{etiquetaNombre}</label>
        <div className="flex items-center gap-3">
          {/* La vista previa: así se va a ver en las listas. */}
          <Insignia nombre={nombre || "?"} color={color} emoji={emoji} />
          <input
            id={`${id}-nombre`}
            type="text"
            aria-describedby={idError}
            placeholder={placeholder}
            value={nombre}
            onChange={(e) => alCambiarNombre(e.target.value)}
            maxLength={maximoNombre}
            required
            className="campo"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="rotulo">Color</span>
        <SelectorColor valor={color} alCambiar={(hex) => alCambiarColor(hex.toLowerCase())} />
        <p className="text-xs text-tenue">
          {aviso ?? "Arriba elegís el color; abajo, si lo querés más oscuro o más claro."}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="rotulo">
          Emoji <span className="font-normal text-tenue">· opcional</span>
        </span>
        <SelectorEmoji id={`${id}-emoji`} valor={emoji} alCambiar={alCambiarEmoji} />
      </div>
    </div>
  );
}
