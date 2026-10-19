/**
 * Las categorías con las que arranca una cuenta nueva. Los colores van un
 * poco apagados, en la misma familia que el celeste y el verde de las
 * monedas: saturados a pleno gritaban más que el resto de la pantalla (se
 * notaba en el anillo del resumen). Servicios dejó el cian, que se confundía
 * con el celeste de los pesos, por un ámbar que acompaña a su ícono de rayo.
 *
 * Solo afecta a las cuentas nuevas: las categorías ya creadas, y las que el
 * usuario arma con el selector de color, quedan con el color que eligió.
 *
 * Cada una trae su emoji (reemplazó a los íconos dibujados que se elegían por
 * el nombre). Las cuentas que ya existían los recibieron con la migración
 * emojis_categorias_prefijadas; si se cambian, esto no vuelve a tocarlos.
 */
export const DEFAULT_CATEGORIES: { name: string; color: string; emoji: string }[] = [
  { name: "Alimentación", color: "#e8925a", emoji: "🍽️" },
  { name: "Transporte", color: "#7b93e3", emoji: "🚗" },
  { name: "Vivienda", color: "#a38be6", emoji: "🏠" },
  { name: "Servicios", color: "#d9b456", emoji: "💡" },
  { name: "Ocio", color: "#dd7fac", emoji: "🎉" },
  { name: "Salud", color: "#5fbf91", emoji: "💊" },
  { name: "Otros", color: "#8a96a4", emoji: "📦" },
];
