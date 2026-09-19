import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendMail, resumenEmail } from "@/lib/mailer";
import { enviarPushAUsuario, type AvisoPush } from "@/lib/push";
import { formatMoney, monthLabel } from "@/lib/format";

/**
 * Avisos automáticos a quien los tiene activados, por mail, por notificación o
 * por las dos vías:
 * - el día 1 de cada mes, lo gastado el mes anterior, con link al Resumen mensual;
 * - el 1 de enero, además, lo gastado el año anterior, con link al Resumen anual.
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
    clave: `${anioPrevio}-${String(mesPrevio).padStart(2, "0")}`,
    // Los gastos guardan la fecha a las 00:00 UTC del día elegido, igual que en
    // los resúmenes, así que el rango va en UTC.
    desde: new Date(Date.UTC(anioPrevio, mesPrevio - 1, 1)),
    hasta: new Date(Date.UTC(anio, mes - 1, 1)),
  };
}

async function totalesDelPeriodo(userId: string, desde: Date, hasta: Date) {
  const grupos = await prisma.expense.groupBy({
    by: ["currency"],
    where: { userId, date: { gte: desde, lt: hasta } },
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
  return { pesos, dolares, cantidad };
}

/** "$ 12.000,00 y US$ 50,00", solo con las monedas que tuvieron gasto. */
function montosEnTexto(pesos: number, dolares: number) {
  return [pesos > 0 ? formatMoney(pesos, "UYU") : null, dolares > 0 ? formatMoney(dolares, "USD") : null]
    .filter((m): m is string => m !== null)
    .join(" y ");
}

type ArmarResumen = { userId: string; nombre: string | null; ahora: Date; origin: string };

/** El aviso del mes que terminó. Lleva al Resumen mensual de ese mes. */
export async function armarResumenMensual({ userId, nombre, ahora, origin }: ArmarResumen) {
  const periodo = mesAnterior(ahora);
  const totales = await totalesDelPeriodo(userId, periodo.desde, periodo.hasta);

  const etiqueta = monthLabel(periodo.clave); // "setiembre de 2026"
  const mesConAnio = etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1);
  const soloMes = mesConAnio.split(" de ")[0];
  const url = `${origin}/monthly?mes=${periodo.clave}`;
  const montos = montosEnTexto(totales.pesos, totales.dolares);

  const push: AvisoPush = {
    title: `${soloMes} terminó`,
    body: montos
      ? `Gastaste ${montos}. Tocá para ver el resumen del mes.`
      : "No registraste gastos. Tocá para ver el resumen del mes.",
    url,
    tag: `resumen-${periodo.clave}`,
  };
  const mail = resumenEmail({ nombre, periodo: mesConAnio, esAnual: false, ...totales, url });

  return { clave: periodo.clave, push, mail };
}

/** El aviso del año que terminó. Lleva al Resumen anual de ese año. */
export async function armarResumenAnual({ userId, nombre, ahora, origin }: ArmarResumen) {
  const anio = fechaEnUruguay(ahora).anio - 1;
  const totales = await totalesDelPeriodo(
    userId,
    new Date(Date.UTC(anio, 0, 1)),
    new Date(Date.UTC(anio + 1, 0, 1))
  );
  const url = `${origin}/reports?year=${anio}`;
  const montos = montosEnTexto(totales.pesos, totales.dolares);

  const push: AvisoPush = {
    title: `Terminó ${anio}`,
    body: montos
      ? `En el año gastaste ${montos}. Tocá para ver el resumen del año.`
      : `No registraste gastos en ${anio}. Tocá para ver el resumen del año.`,
    url,
    // Distinto del aviso mensual: el 1 de enero llegan los dos y no se pisan.
    tag: `resumen-anual-${anio}`,
  };
  const mail = resumenEmail({ nombre, periodo: String(anio), esAnual: true, ...totales, url });

  return { clave: String(anio), push, mail };
}

type Campo = "monthlyNoticeSentFor" | "annualNoticeSentFor";

/**
 * Manda un aviso a todos los que lo tienen activado. Es seguro correrlo varias
 * veces: cada usuario se marca con el período ya avisado ANTES de mandarle
 * nada, así una segunda ejecución del cron no duplica avisos.
 */
async function enviarAvisos({
  clave,
  campo,
  armar,
  ahora,
  origin,
}: {
  clave: string;
  campo: Campo;
  armar: (a: ArmarResumen) => Promise<{ push: AvisoPush; mail: { subject: string; text: string; html: string } }>;
  ahora: Date;
  origin: string;
}) {
  // `not: clave` solo no alcanza: en SQL, null <> 'x' da null y dejaría afuera
  // a quien nunca recibió un aviso.
  const pendiente: Prisma.UserWhereInput =
    campo === "monthlyNoticeSentFor"
      ? { OR: [{ monthlyNoticeSentFor: null }, { monthlyNoticeSentFor: { not: clave } }] }
      : { OR: [{ annualNoticeSentFor: null }, { annualNoticeSentFor: { not: clave } }] };
  const marcar: Prisma.UserUpdateManyMutationInput =
    campo === "monthlyNoticeSentFor" ? { monthlyNoticeSentFor: clave } : { annualNoticeSentFor: clave };

  const usuarios = await prisma.user.findMany({
    where: {
      AND: [{ OR: [{ notifyMonthlyEmail: true }, { notifyMonthlyPush: true }] }, pendiente],
    },
    select: { id: true, email: true, name: true, notifyMonthlyEmail: true, notifyMonthlyPush: true },
  });

  let mails = 0;
  let notificaciones = 0;

  for (const usuario of usuarios) {
    const reclamo = await prisma.user.updateMany({ where: { id: usuario.id, ...pendiente }, data: marcar });
    if (reclamo.count === 0) continue;

    try {
      const resumen = await armar({ userId: usuario.id, nombre: usuario.name, ahora, origin });
      if (usuario.notifyMonthlyEmail && (await sendMail({ to: usuario.email, ...resumen.mail }))) {
        mails++;
      }
      if (usuario.notifyMonthlyPush) {
        notificaciones += (await enviarPushAUsuario(usuario.id, resumen.push)).enviados;
      }
    } catch (error) {
      console.error(`[resumen ${campo}] falló el aviso de un usuario:`, error);
    }
  }

  return { tocaHoy: true, periodo: clave, usuarios: usuarios.length, mails, notificaciones };
}

const NO_TOCA = { tocaHoy: false, usuarios: 0, mails: 0, notificaciones: 0 };

/** Lo llama el cron todos los días; solo hace algo el día 1 (hora de Uruguay). */
export async function enviarResumenesMensuales(ahora: Date, origin: string) {
  if (fechaEnUruguay(ahora).dia !== 1) return NO_TOCA;
  return enviarAvisos({
    clave: mesAnterior(ahora).clave,
    campo: "monthlyNoticeSentFor",
    armar: armarResumenMensual,
    ahora,
    origin,
  });
}

/** Lo llama el cron todos los días; solo hace algo el 1 de enero (hora de Uruguay). */
export async function enviarResumenesAnuales(ahora: Date, origin: string) {
  const { anio, mes, dia } = fechaEnUruguay(ahora);
  if (mes !== 1 || dia !== 1) return NO_TOCA;
  return enviarAvisos({
    clave: String(anio - 1),
    campo: "annualNoticeSentFor",
    armar: armarResumenAnual,
    ahora,
    origin,
  });
}
