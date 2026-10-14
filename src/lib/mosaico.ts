/**
 * El mosaico de un grupo: reparte un rectángulo entre sus secciones para que
 * el área de cada una sea proporcional a lo que se gastó en ella.
 *
 * Es un mapa de árbol por bisección: se ordenan de mayor a menor, se parten en
 * dos mitades de peso parecido y se corta el rectángulo por su lado más largo.
 * Así las piezas salen más cuadradas que largas y el nombre entra cómodo.
 */

export type Pieza<T> = { dato: T; x: number; y: number; ancho: number; alto: number };

/** Ninguna pieza baja de esta parte del mosaico: si no, no entra ni el nombre. */
const PARTE_MINIMA = 0.08;

export function trazarMosaico<T>(
  datos: { dato: T; peso: number }[],
  /** Ancho sobre alto del mosaico: cambia entre PC y celular. */
  proporcion: number
): Pieza<T>[] {
  if (datos.length === 0) return [];

  const total = datos.reduce((suma, d) => suma + d.peso, 0);
  // Sin gastos todavía, todas las piezas miden lo mismo.
  const piso = total > 0 ? total * PARTE_MINIMA : 1;
  const piezas = datos
    .map((d) => ({ dato: d.dato, peso: Math.max(d.peso, piso) }))
    .sort((a, b) => b.peso - a.peso);

  const resultado: Pieza<T>[] = [];

  function partir(grupo: typeof piezas, x: number, y: number, ancho: number, alto: number) {
    if (grupo.length === 1) {
      resultado.push({ dato: grupo[0].dato, x, y, ancho, alto });
      return;
    }

    const peso = grupo.reduce((suma, p) => suma + p.peso, 0);
    // El corte que deja las dos mitades más parejas.
    let corte = 1;
    let acumulado = 0;
    let mejor = Infinity;
    for (let i = 0; i < grupo.length - 1; i++) {
      acumulado += grupo[i].peso;
      const desbalance = Math.abs(peso / 2 - acumulado);
      if (desbalance < mejor) {
        mejor = desbalance;
        corte = i + 1;
      }
    }

    const primera = grupo.slice(0, corte);
    const segunda = grupo.slice(corte);
    const parte = primera.reduce((suma, p) => suma + p.peso, 0) / peso;

    // Se corta el lado más largo, medido en pantalla y no en porcentaje.
    if (ancho * proporcion >= alto) {
      partir(primera, x, y, ancho * parte, alto);
      partir(segunda, x + ancho * parte, y, ancho * (1 - parte), alto);
    } else {
      partir(primera, x, y, ancho, alto * parte);
      partir(segunda, x, y + alto * parte, ancho, alto * (1 - parte));
    }
  }

  partir(piezas, 0, 0, 100, 100);
  return resultado;
}
