import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { sendMail } from "@/lib/mailer";
import { enviarPushAUsuario } from "@/lib/push";
import { armarResumenMensual } from "@/lib/monthly-summary";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

/** Pocas por hora: cada prueba manda un mail real. */
const PRUEBAS_POR_HORA = 5;

/**
 * Manda ahora mismo el aviso del último mes terminado, por los canales que el
 * usuario tiene activos. Sirve para verificar que llega sin esperar al día 1.
 */
export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limite = await checkRateLimit(`notif-test:${userId}`, PRUEBAS_POR_HORA, 60 * 60);
  if (!limite.allowed) return tooManyRequests(limite.retryAfterSeconds);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, notifyMonthlyEmail: true, notifyMonthlyPush: true },
  });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!user.notifyMonthlyEmail && !user.notifyMonthlyPush) {
    return NextResponse.json({ error: "Activá al menos un aviso para probarlo" }, { status: 400 });
  }

  const resumen = await armarResumenMensual({
    userId,
    nombre: user.name,
    ahora: new Date(),
    origin: new URL(request.url).origin,
  });

  const mail = user.notifyMonthlyEmail
    ? await sendMail({
        to: user.email,
        subject: `[Prueba] ${resumen.mail.subject}`,
        text: resumen.mail.text,
        html: resumen.mail.html,
      })
    : null;

  const push = user.notifyMonthlyPush
    ? (
        await enviarPushAUsuario(userId, {
          ...resumen.push,
          title: `[Prueba] ${resumen.push.title}`,
          tag: "resumen-prueba",
        })
      ).enviados
    : null;

  return NextResponse.json({ mail, push });
}
