import { prisma } from "@/lib/prisma";
import { sendMail, monthlySummaryEmail } from "@/lib/mailer";
import { enviarPushAUsuario, type AvisoPush } from "@/lib/push";
import { formatMoney, monthLabel } from "@/lib/format";

/**
 * Aviso de fin de mes: el día 1 de cada mes, a quien lo activó, se le manda lo
 * que gastó el mes anterior (por mail, por notificación o por las dos vías).
 */

/**
 * Fecha calendario en Uruguay. El cron corre en UTC, pero "terminó el mes" es
 * según el reloj de acá: el 31 a las 22 hs en Montevideo ya es día 1 en UTC.
 */
export function fechaEnUruguay(fecha: Date) {
  const [anio, mes, dia] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(fecha)
    .split("-")
    .map(Number);
  return { anio, mes, dia };
}

/** El mes que terminó respecto de `fecha`, con el rango de fechas para consultar. */
function mesAnterior(fecha: Date) {
  const { anio, mes } = fechaEnUruguay(fecha);
  const anioPrevio = mes === 1 ? anio - 1 : anio;
  const mesPrevio = mes === 1 ? 12 : mes - 1;
  return {
    anio: anioPrevio,
    clave: `${anioPrevio}-${String(mesPrevio).padStart(2, "0")}`,
    // Los gastos guardan la fecha a las 00:00 UTC del día elegido, igual que en
    // el resumen anual, así que el rango va en UTC.
    desde: new Date(Date.UTC(anioPrevio, mesPrevio - 1, 1)),
    hasta: new Date(Date.UTC(anio, mes - 1, 1)),
  };
}

/** Arma el contenido del aviso (mail y notificación) del mes que terminó. */
export async function armarResumenMensual({
  userId,
  nombre,
  ahora,
  origin,
}: {
  userId: string;
  nombre: string | null;
  ahora: Date;
  origin: string;
}) {
  const periodo = mesAnterior(ahora);

  const grupos = await prisma.expense.groupBy({
    by: ["currency"],
    where: { userId, date: { gte: periodo.desde, lt: periodo.hasta } },
    _sum: { amount: true },
    _count: { _all: true },
  });

  let pesos = 0;
  let dolares = 0;
  let cantidad = 0;
  for (const grupo of grupos) {
    const monto = Number(grupo._sum.amount ?? 0);
    if (grupo.currency === "UYU") pesos = monto;
    else dolares = monto;
    cantidad += grupo._count._all;
  }

  const etiqueta = monthLabel(periodo.clave); // "setiembre de 2026"
  const mesConAnio = etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1);
  const soloMes = mesConAnio.split(" de ")[0];
  const url = `${origin}/reports?year=${periodo.anio}`;

  const montos = [
    pesos > 0 ? formatMoney(pesos, "UYU") : null,
    dolares > 0 ? formatMoney(dolares, "USD") : null,
  ].filter((m): m is string => m !== null);

  const push: AvisoPush = {
    title: `${soloMes} terminó`,
    body:
      montos.length > 0
        ? `Gastaste ${montos.join(" y ")}. Tocá para ver el resumen.`
        : "No registraste gastos. Tocá para ver el resumen.",
    url,
    tag: `resumen-${periodo.clave}`,
  };

  const mail = monthlySummaryEmail({ nombre, mes: mesConAnio, pesos, dolares, cantidad, url });

  return { clave: periodo.clave, push, mail };
}

/**
 * Lo llama el cron todos los días; solo hace algo el día 1 (hora de Uruguay).
 * Es seguro correrlo varias veces: cada usuario se marca con el mes ya avisado
 * antes de mandarle nada, así una segunda ejecución no duplica avisos.
 */
export async function enviarResumenesMensuales(ahora: Date, origin: string) {
  if (fechaEnUruguay(ahora).dia !== 1) {
    return { tocaHoy: false, usuarios: 0, mails: 0, notificaciones: 0 };
  }

  const { clave } = mesAnterior(ahora);
  // `not: clave` solo no alcanza: en SQL, null <> 'x' da null y dejaría afuera a
  // quien nunca recibió un aviso.
  const pendiente = {
    OR: [{ monthlyNoticeSentFor: null }, { monthlyNoticeSentFor: { not: clave } }],
  };

  const usuarios = await prisma.user.findMany({
    where: {
      AND: [{ OR: [{ notifyMonthlyEmail: true }, { notifyMonthlyPush: true }] }, pendiente],
    },
    select: { id: true, email: true, name: true, notifyMonthlyEmail: true, notifyMonthlyPush: true },
  });

  let mails = 0;
  let notificaciones = 0;

  for (const usuario of usuarios) {
    // Se reclama el aviso antes de mandarlo. Si otra ejecución ya lo reclamó,
    // count es 0 y se saltea.
    const reclamo = await prisma.user.updateMany({
      where: { id: usuario.id, ...pendiente },
      data: { monthlyNoticeSentFor: clave },
    });
    if (reclamo.count === 0) continue;

    try {
      const resumen = await armarResumenMensual({
        userId: usuario.id,
        nombre: usuario.name,
        ahora,
        origin,
      });

      if (usuario.notifyMonthlyEmail && (await sendMail({ to: usuario.email, ...resumen.mail }))) {
        mails++;
      }
      if (usuario.notifyMonthlyPush) {
        notificaciones += (await enviarPushAUsuario(usuario.id, resumen.push)).enviados;
      }
    } catch (error) {
      console.error("[resumen mensual] falló el aviso de un usuario:", error);
    }
  }

  return { tocaHoy: true, mes: clave, usuarios: usuarios.length, mails, notificaciones };
}
