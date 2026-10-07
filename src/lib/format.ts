export function formatMoney(amount: number | string, currency: "UYU" | "USD") {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string) {
  const [year, mon] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, mon - 1, 1));
  return new Intl.DateTimeFormat("es-UY", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

export function monthShortLabel(monthIndex: number) {
  const date = new Date(Date.UTC(2000, monthIndex, 1));
  return new Intl.DateTimeFormat("es-UY", { month: "short", timeZone: "UTC" }).format(date);
}

/* --- el campo de monto -------------------------------------------------
   `<input type="number">` no admite separadores de miles, así que el campo
   pasó a ser de texto y el formato se hace acá. El par formatear/leer tiene
   que cerrar siempre: lo que se muestra y lo que se guarda son lo mismo. */

/** Cuántos dígitos enteros se aceptan antes de que el número pierda precisión. */
const MAX_ENTEROS = 12;

/**
 * Lo que se va tecleando, con puntos de miles y coma decimal.
 *
 * Respeta el estado intermedio: "18500," sigue siendo "18.500," para que se
 * pueda seguir escribiendo los centavos sin que el campo los coma.
 */
export function formatMoneyInput(texto: string): string {
  const limpio = texto.replace(/[^\d,]/g, "");
  const [crudoEnteros = "", ...resto] = limpio.split(",");

  const enteros = crudoEnteros.replace(/^0+(?=\d)/, "").slice(0, MAX_ENTEROS);
  const conMiles = enteros === "" ? "" : Number(enteros).toLocaleString("es-UY");

  // Sin coma tecleada no se inventa una: cortaría la escritura.
  if (resto.length === 0) return conMiles;

  const decimales = resto.join("").slice(0, 2);
  return `${conMiles === "" ? "0" : conMiles},${decimales}`;
}

/** El camino inverso: "18.500,25" → 18500.25. Devuelve NaN si no hay número. */
export function parseMoneyInput(texto: string): number {
  const limpio = texto.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  if (limpio === "" || limpio === ".") return NaN;
  return Number(limpio);
}
