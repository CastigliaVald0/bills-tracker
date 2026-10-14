/**
 * Lo que comparten el asistente de creación, la API y las pantallas de grupos.
 * Sin dependencias de servidor: lo importan también los componentes de cliente.
 */

/** Los colores para elegir. Todos se leen bien sobre el fondo de la app. */
export const COLORES_DE_GRUPO = [
  "#6fbee4",
  "#7fc895",
  "#e4a05c",
  "#e4705c",
  "#c58fe0",
  "#e0c45c",
  "#5cc9c0",
  "#e48fb0",
];

/** Ideas para arrancar con las secciones. Se tocan y se agregan. */
export const SECCIONES_SUGERIDAS = [
  "Materiales",
  "Mano de obra",
  "Cocina",
  "Baño",
  "Dormitorio",
  "Comida",
  "Transporte",
  "Alojamiento",
];

export const MAXIMO_NOMBRE_GRUPO = 60;
export const MAXIMO_NOMBRE_SECCION = 40;
/** Tope de secciones por grupo: más que esto ya no es una lista que se lea. */
export const MAXIMO_SECCIONES = 30;

export const COLOR_VALIDO = /^#[0-9a-fA-F]{6}$/;

/** Saca espacios de más y repetidos, sin distinguir mayúsculas. */
export function limpiarSecciones(nombres: string[]): string[] {
  const vistas = new Set<string>();
  const limpias: string[] = [];
  for (const crudo of nombres) {
    const nombre = crudo.trim().replace(/\s+/g, " ").slice(0, MAXIMO_NOMBRE_SECCION);
    const clave = nombre.toLowerCase();
    if (!nombre || vistas.has(clave)) continue;
    vistas.add(clave);
    limpias.push(nombre);
  }
  return limpias.slice(0, MAXIMO_SECCIONES);
}
