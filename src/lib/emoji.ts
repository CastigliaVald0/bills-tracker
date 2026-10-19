import { z } from "zod";

/**
 * El emoji de una categoría o de una sección. Sin dependencias de servidor:
 * lo usan las rutas (para validar) y los formularios (para elegir).
 */

/** Un único grafema que sea un emoji (incluye banderas, tonos de piel y los
    compuestos como 👨‍👩‍👧). Una letra o un número no cuentan. */
export function esEmoji(texto: string): boolean {
  const grafemas = [...new Intl.Segmenter("es", { granularity: "grapheme" }).segment(texto)];
  if (grafemas.length !== 1) return false;
  return /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(grafemas[0].segment);
}

/** El último emoji de lo que se escribió (el recién elegido); null si no hay ninguno. */
export function ultimoEmoji(texto: string): string | null {
  const emojis = [...new Intl.Segmenter("es", { granularity: "grapheme" }).segment(texto)]
    .map((g) => g.segment)
    .filter(esEmoji);
  return emojis.at(-1) ?? null;
}

/** Para las rutas: un emoji válido, o null para sacarlo. */
export const emojiSchema = z
  .string()
  .max(32)
  .refine(esEmoji, "Tiene que ser un solo emoji.")
  .nullable();
