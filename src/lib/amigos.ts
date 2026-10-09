/**
 * Las reglas de la amistad, separadas de la base para poder probarlas.
 *
 * Acá se esconden los bugs de esta función: la solicitud cruzada, el rechazado
 * que insiste, el que se agrega a sí mismo. `decidirSolicitud` es pura y
 * recibe las filas que ya existen entre dos personas, así cada regla se
 * verifica sin levantar una base.
 */

export type EstadoAmistad = "pendiente" | "aceptada" | "rechazada";

export type FilaAmistad = {
  id: string;
  solicitanteId: string;
  destinatarioId: string;
  estado: EstadoAmistad;
};

export type Decision =
  | { tipo: "crear" }
  /** Ya había una solicitud al revés: aceptarla en vez de dejar dos pendientes. */
  | { tipo: "aceptar-cruzada"; id: string }
  /** Volver a mandar una que el otro nunca respondió no hace nada nuevo. */
  | { tipo: "ya-pendiente" }
  | { tipo: "ya-amigos" }
  /** El destinatario ya dijo que no; insistir no está permitido. */
  | { tipo: "rechazada-antes" }
  | { tipo: "uno-mismo" };

/**
 * Qué hacer cuando `deId` quiere agregar a `paraId`.
 *
 * `existentes` son todas las filas entre los dos, en cualquier dirección.
 */
export function decidirSolicitud(
  existentes: FilaAmistad[],
  deId: string,
  paraId: string
): Decision {
  if (deId === paraId) return { tipo: "uno-mismo" };

  const mia = existentes.find(
    (f) => f.solicitanteId === deId && f.destinatarioId === paraId
  );
  const suya = existentes.find(
    (f) => f.solicitanteId === paraId && f.destinatarioId === deId
  );

  // Una amistad aceptada en cualquier dirección cierra el tema.
  if (mia?.estado === "aceptada" || suya?.estado === "aceptada") {
    return { tipo: "ya-amigos" };
  }

  // Si el otro ya me había mandado una y está esperando, esto es un sí.
  if (suya?.estado === "pendiente") return { tipo: "aceptar-cruzada", id: suya.id };

  if (mia?.estado === "pendiente") return { tipo: "ya-pendiente" };

  // Me rechazó antes: no puedo volver a pedir. Que él me rechazara a mí no me
  // impide a mí rechazarlo ni a él agregarme después: esa sería la fila opuesta.
  if (mia?.estado === "rechazada") return { tipo: "rechazada-antes" };

  return { tipo: "crear" };
}

/* --- el código de amigo ------------------------------------------------- */

/**
 * Alfabeto sin caracteres que se confundan al dictar o al copiar a mano:
 * sin O ni 0, sin I ni 1 ni L.
 */
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const LARGO = 6;
export const PREFIJO = "BT-";

/** Un código nuevo, con aleatoriedad criptográfica. */
export function generarCodigo(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(LARGO));
  let salida = "";
  for (const b of bytes) salida += ALFABETO[b % ALFABETO.length];
  return PREFIJO + salida;
}

/**
 * Lo que la persona escribe → el código canónico, o null si no puede serlo.
 *
 * Se perdona todo lo que pasa al copiar de un mensaje: minúsculas, espacios,
 * guiones de más y el prefijo olvidado.
 *
 * Lo que no se adivina son los caracteres ambiguos. Como el alfabeto ya excluye
 * O, I, L, 0 y 1, cualquiera de esos es un error de tipeo que no se puede
 * resolver sin inventar: no hay forma de saber si un "0" quiso ser otra cosa.
 * Se rechaza y se pide que lo revise.
 */
export function normalizarCodigo(texto: string): string | null {
  const limpio = texto.toUpperCase().replace(/[\s-]/g, "").replace(/^BT/, "");

  if (limpio.length !== LARGO) return null;
  if (![...limpio].every((c) => ALFABETO.includes(c))) return null;

  return PREFIJO + limpio;
}

/* --- la búsqueda por nombre --------------------------------------------- */

/** Mínimo de letras para buscar: con menos, la búsqueda sería un listado. */
export const MINIMO_BUSQUEDA = 3;
/** Tope de resultados: tampoco con tres letras se puede barrer la base. */
export const MAXIMO_RESULTADOS = 8;

/** Lo que se muestra de alguien que todavía no es tu amigo. */
export function finalDelCodigo(codigo: string | null): string {
  if (!codigo) return "";
  return codigo.slice(-3);
}
