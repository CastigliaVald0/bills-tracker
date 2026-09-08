/**
 * Helpers para el "mes hasta" de los gastos fijos en cuotas.
 * Se guarda como el día 1 del mes en UTC para que comparar meses sea simple
 * y no se corra de mes por la zona horaria.
 */

/** "2027-03" → Date(2027-03-01T00:00:00Z). Devuelve null si el formato no sirve. */
export function monthInputToDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;

  return new Date(Date.UTC(year, month - 1, 1));
}

/** Date → "2027-03", el formato que espera <input type="month">. */
export function dateToMonthInput(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Date → "mar 2027" */
export function monthYearLabel(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-UY", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** Primer día del mes actual, en UTC. */
export function currentMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Cuántas cuotas quedan entre el próximo cobro y el mes final, inclusive.
 * Si hoy ya pasó el día de cobro, la primera cuota cae el mes que viene.
 */
export function countInstallments(endsOn: Date, dayOfMonth: number): number {
  const now = new Date();
  const firstChargeMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + (now.getUTCDate() > dayOfMonth ? 1 : 0), 1)
  );

  const months =
    (endsOn.getUTCFullYear() - firstChargeMonth.getUTCFullYear()) * 12 +
    (endsOn.getUTCMonth() - firstChargeMonth.getUTCMonth()) +
    1;

  return Math.max(0, months);
}

/**
 * ¿El día de cobro de este mes ya pasó (o es hoy)?
 *
 * Importa al dar de alta un gasto fijo: el cron de este mes ya corrió ese día
 * y el gasto todavía no existía, así que nadie lo va a generar hasta el mes
 * que viene. En ese caso hay que generarlo en el momento.
 */
export function diaDeCobroYaPaso(dayOfMonth: number, now = new Date()): boolean {
  return dayOfMonth <= now.getUTCDate();
}
