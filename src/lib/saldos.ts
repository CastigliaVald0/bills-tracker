/**
 * Cuentas de un grupo compartido: cómo se reparte un gasto y quién le debe a
 * quién. Sin dependencias de servidor: lo usan la API y la página.
 *
 * Todo se hace en centavos enteros para que las partes sumen exactamente el
 * total, sin errores de redondeo.
 */

export type Moneda = "UYU" | "USD";

const aCentavos = (monto: number) => Math.round(monto * 100);
const aMonto = (centavos: number) => centavos / 100;

/**
 * Divide un monto en partes iguales entre las personas dadas. Los centavos que
 * no se pueden dividir parejo van a quien pagó, si participa; si no, al
 * primero de la lista.
 */
export function repartirEnPartesIguales(
  monto: number,
  personas: string[],
  pagadorId: string
): Map<string, number> {
  const total = aCentavos(monto);
  const base = Math.floor(total / personas.length);
  let resto = total - base * personas.length;

  const orden = personas.includes(pagadorId)
    ? [pagadorId, ...personas.filter((p) => p !== pagadorId)]
    : personas;

  const partes = new Map<string, number>();
  for (const persona of orden) {
    const extra = resto > 0 ? 1 : 0;
    resto -= extra;
    partes.set(persona, aMonto(base + extra));
  }
  return partes;
}

/**
 * Divide un monto por partes, como en Tricount: quien tiene 2 partes paga el
 * doble que quien tiene 1, y con 0 no participa. A cada uno le toca su
 * proporción redondeada hacia abajo al centavo; los centavos que sobran van
 * de a uno a los que más perdieron al redondear (y, a igual pérdida, primero
 * a quien pagó), así las partes suman exactamente el total.
 */
export function repartirPorPartes(
  monto: number,
  pesos: Map<string, number>,
  pagadorId: string
): Map<string, number> {
  const total = aCentavos(monto);
  const conPartes = [...pesos].filter(([, peso]) => peso > 0);
  const sumaDePesos = conPartes.reduce((suma, [, peso]) => suma + peso, 0);
  if (sumaDePesos === 0) return new Map();

  const cuentas = conPartes.map(([persona, peso]) => {
    const exacto = (total * peso) / sumaDePesos;
    return { persona, centavos: Math.floor(exacto), perdido: exacto - Math.floor(exacto) };
  });
  let resto = total - cuentas.reduce((suma, c) => suma + c.centavos, 0);
  const porPerdida = [...cuentas].sort(
    (a, b) => b.perdido - a.perdido || Number(b.persona === pagadorId) - Number(a.persona === pagadorId)
  );
  for (const cuenta of porPerdida) {
    if (resto === 0) break;
    cuenta.centavos++;
    resto--;
  }

  return new Map(cuentas.map((c) => [c.persona, aMonto(c.centavos)]));
}

/** ¿Las partes escritas a mano suman exactamente el total? */
export function partesCierran(monto: number, partes: number[]): boolean {
  return partes.reduce((suma, p) => suma + aCentavos(p), 0) === aCentavos(monto);
}

export type MovimientoDeSaldo =
  | { tipo: "gasto"; moneda: Moneda; pagadorId: string; partes: { userId: string; monto: number }[] }
  | { tipo: "pago"; moneda: Moneda; deId: string; aId: string; monto: number };

/**
 * El saldo de cada persona, en cada moneda. Positivo: le deben. Negativo:
 * debe. Las monedas no se mezclan nunca.
 */
export function calcularSaldos(movimientos: MovimientoDeSaldo[]) {
  const saldos: Record<Moneda, Map<string, number>> = { UYU: new Map(), USD: new Map() };
  const sumar = (moneda: Moneda, persona: string, centavos: number) =>
    saldos[moneda].set(persona, (saldos[moneda].get(persona) ?? 0) + centavos);

  for (const m of movimientos) {
    if (m.tipo === "gasto") {
      for (const parte of m.partes) {
        // Lo que le toca a cada uno lo debe; si pagó él, se compensa abajo.
        sumar(m.moneda, parte.userId, -aCentavos(parte.monto));
        sumar(m.moneda, m.pagadorId, aCentavos(parte.monto));
      }
    } else {
      // Quien paga achica su deuda; quien cobra, lo que le deben.
      sumar(m.moneda, m.deId, aCentavos(m.monto));
      sumar(m.moneda, m.aId, -aCentavos(m.monto));
    }
  }

  return {
    UYU: new Map([...saldos.UYU].map(([p, c]) => [p, aMonto(c)])),
    USD: new Map([...saldos.USD].map(([p, c]) => [p, aMonto(c)])),
  };
}

export type Deuda = { deId: string; aId: string; monto: number; moneda: Moneda };

/**
 * La menor cantidad de pagos que deja a todos en cero: el que más debe le
 * paga al que más le deben, y así hasta que no queda nada.
 */
export function simplificarDeudas(saldos: Map<string, number>, moneda: Moneda): Deuda[] {
  const deudores = [...saldos]
    .map(([persona, saldo]) => ({ persona, centavos: -aCentavos(saldo) }))
    .filter((d) => d.centavos > 0)
    .sort((a, b) => b.centavos - a.centavos);
  const acreedores = [...saldos]
    .map(([persona, saldo]) => ({ persona, centavos: aCentavos(saldo) }))
    .filter((a) => a.centavos > 0)
    .sort((a, b) => b.centavos - a.centavos);

  const deudas: Deuda[] = [];
  let i = 0;
  let j = 0;
  while (i < deudores.length && j < acreedores.length) {
    const centavos = Math.min(deudores[i].centavos, acreedores[j].centavos);
    deudas.push({ deId: deudores[i].persona, aId: acreedores[j].persona, monto: aMonto(centavos), moneda });
    deudores[i].centavos -= centavos;
    acreedores[j].centavos -= centavos;
    if (deudores[i].centavos === 0) i++;
    if (acreedores[j].centavos === 0) j++;
  }
  return deudas;
}

/** ¿Esta persona está en cero en todas las monedas? */
export function estaSaldado(saldos: ReturnType<typeof calcularSaldos>, persona: string): boolean {
  return (["UYU", "USD"] as const).every((m) => Math.abs(saldos[m].get(persona) ?? 0) < 0.005);
}
