/**
 * Valida el destino de un `?volverA=` antes de mandar a alguien ahí.
 *
 * Sin esta validación el parámetro es una redirección abierta: cualquiera puede
 * mandar `/login?volverA=https://sitio-falso.com`, y la víctima, que vio un
 * enlace de nuestro dominio y se autenticó, termina en otro lado creyendo que
 * sigue acá.
 *
 * Solo se acepta una ruta propia: tiene que empezar con una barra y no con dos
 * (`//otro.com` es una URL con protocolo heredado, no una ruta) ni con `/\`,
 * que algunos navegadores interpretan igual.
 */
export function rutaInternaSegura(valor: string | null | undefined, porDefecto: string): string {
  if (!valor) return porDefecto;
  if (!valor.startsWith("/")) return porDefecto;
  if (valor.startsWith("//") || valor.startsWith("/\\")) return porDefecto;
  return valor;
}
