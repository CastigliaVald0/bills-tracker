/**
 * El círculo que encabeza cada fila de gasto, en el color de su categoría.
 * Reemplazó al filete de color del borde: el color sigue siendo lo que
 * identifica a la categoría, y adentro va su emoji o, si no tiene, su
 * inicial. Los estilos están en globals.css (ver .insignia).
 */
export function Insignia({
  nombre,
  color,
  emoji = null,
  chica = false,
}: {
  nombre: string;
  color: string;
  emoji?: string | null;
  chica?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`insignia ${chica ? "insignia-chica" : ""}`}
      style={{ "--cat": color } as React.CSSProperties}
    >
      {emoji ? (
        <span className="insignia-emoji">{emoji}</span>
      ) : (
        nombre.trim().charAt(0).toUpperCase() || "·"
      )}
    </span>
  );
}
