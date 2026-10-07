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

/** Meses entre dos primeros-de-mes, contando los dos extremos. */
function mesesInclusive(desde: Date, hasta: Date): number {
  return (
    (hasta.getUTCFullYear() - desde.getUTCFullYear()) * 12 +
    (hasta.getUTCMonth() - desde.getUTCMonth()) +
    1
  );
}

/**
 * El mes en que cae la primera cuota de un gasto fijo dado de alta en `now`.
 * Si el día de cobro de este mes todavía no pasó, la primera cae este mes; si
 * ya pasó, el que viene.
 */
export function primerMesDeCobro(dayOfMonth: number, now = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + (now.getUTCDate() > dayOfMonth ? 1 : 0), 1)
  );
}

/**
 * Cuántas cuotas quedan entre el próximo cobro y el mes final, inclusive.
 * Si hoy ya pasó el día de cobro, la primera cuota cae el mes que viene.
 */
export function countInstallments(endsOn: Date, dayOfMonth: number): number {
  return Math.max(0, mesesInclusive(primerMesDeCobro(dayOfMonth), endsOn));
}

/**
 * El inverso: de una cantidad de cuotas al mes en que cae la última.
 *
 * Es el cálculo que antes tenía que hacer el usuario de cabeza, y donde era
 * fácil errarle por uno: doce cuotas que arrancan este mes terminan dentro de
 * once, no de doce. Hacerlo acá lo deja escrito una sola vez.
 */
export function mesFinalDeCuotas(
  cuotas: number,
  dayOfMonth: number,
  now = new Date()
): Date | null {
  if (!Number.isInteger(cuotas) || cuotas < 1) return null;
  const primera = primerMesDeCobro(dayOfMonth, now);
  return new Date(Date.UTC(primera.getUTCFullYear(), primera.getUTCMonth() + cuotas - 1, 1));
}

/**
 * En qué cuota va un gasto fijo que tiene fin: `{ actual, total }`.
 *
 * Se cuenta por calendario y no por gastos ya generados: si se borra a mano el
 * gasto de un mes, el progreso no tiene por qué descuadrarse.
 */
export function progresoDeCuotas(
  datos: { createdAt: Date; dayOfMonth: number; endsOn: Date },
  now = new Date()
): { actual: number; total: number } {
  const primera = primerMesDeCobro(datos.dayOfMonth, datos.createdAt);
  const total = Math.max(1, mesesInclusive(primera, datos.endsOn));

  const mesActual = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  // El cobro de este mes solo cuenta si el día ya llegó.
  const transcurridas =
    mesesInclusive(primera, mesActual) - (diaDeCobroYaPaso(datos.dayOfMonth, now) ? 0 : 1);

  return { actual: Math.min(total, Math.max(0, transcurridas)), total };
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
