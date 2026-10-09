import { prisma } from "@/lib/prisma";
import {
  decidirSolicitud,
  generarCodigo,
  type Decision,
  type FilaAmistad,
} from "@/lib/amigos";

/**
 * El puente entre las reglas de `amigos.ts` y la base.
 *
 * Las decisiones viven allá y se prueban sin base; acá solo se leen y se
 * escriben filas.
 */

/** Tu código, creándolo la primera vez que hace falta. */
export async function codigoDe(userId: string): Promise<string> {
  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    select: { codigoAmigo: true },
  });
  if (usuario?.codigoAmigo) return usuario.codigoAmigo;

  // El código es único en la base: si dos cuentas sacan el mismo a la vez, una
  // falla y reintenta. Con 31^6 combinaciones pasa prácticamente nunca.
  for (let intento = 0; intento < 5; intento++) {
    const codigo = generarCodigo();
    try {
      await prisma.user.update({ where: { id: userId }, data: { codigoAmigo: codigo } });
      return codigo;
    } catch {
      continue;
    }
  }
  throw new Error("No se pudo generar un código de amigo");
}

async function filasEntre(a: string, b: string): Promise<FilaAmistad[]> {
  const filas = await prisma.amistad.findMany({
    where: {
      OR: [
        { solicitanteId: a, destinatarioId: b },
        { solicitanteId: b, destinatarioId: a },
      ],
    },
    select: { id: true, solicitanteId: true, destinatarioId: true, estado: true },
  });
  return filas as FilaAmistad[];
}

export type ResultadoSolicitud =
  | { ok: true; estado: "pendiente" | "aceptada" }
  | { ok: false; motivo: Exclude<Decision["tipo"], "crear" | "aceptar-cruzada"> | "no-existe" };

/** Mandar (o cerrar, si era cruzada) una solicitud. */
export async function enviarSolicitud(
  deId: string,
  paraId: string
): Promise<ResultadoSolicitud> {
  const decision = decidirSolicitud(await filasEntre(deId, paraId), deId, paraId);

  switch (decision.tipo) {
    case "crear":
      await prisma.amistad.create({
        data: { solicitanteId: deId, destinatarioId: paraId },
      });
      return { ok: true, estado: "pendiente" };

    case "aceptar-cruzada":
      await prisma.amistad.update({
        where: { id: decision.id },
        data: { estado: "aceptada", respondidaEn: new Date() },
      });
      return { ok: true, estado: "aceptada" };

    default:
      return { ok: false, motivo: decision.tipo };
  }
}

/**
 * Responder una solicitud que me llegó.
 *
 * El `destinatarioId` en el where no es decorativo: impide que alguien acepte
 * o rechace una solicitud que no le fue dirigida pasando un id ajeno.
 */
export async function responderSolicitud(
  userId: string,
  solicitudId: string,
  acepta: boolean
): Promise<boolean> {
  const { count } = await prisma.amistad.updateMany({
    where: { id: solicitudId, destinatarioId: userId, estado: "pendiente" },
    data: { estado: acepta ? "aceptada" : "rechazada", respondidaEn: new Date() },
  });
  return count > 0;
}

/** Deshacer una amistad, o cancelar una solicitud que mandé yo. */
export async function borrarVinculo(userId: string, otroId: string): Promise<boolean> {
  const { count } = await prisma.amistad.deleteMany({
    where: {
      OR: [
        { solicitanteId: userId, destinatarioId: otroId },
        { solicitanteId: otroId, destinatarioId: userId },
      ],
    },
  });
  return count > 0;
}

const PERSONA = { id: true, name: true, email: true, codigoAmigo: true } as const;

/** Todo lo que necesita la página de amigos, en una sola consulta. */
export async function panelDeAmigos(userId: string) {
  const filas = await prisma.amistad.findMany({
    where: { OR: [{ solicitanteId: userId }, { destinatarioId: userId }] },
    include: { solicitante: { select: PERSONA }, destinatario: { select: PERSONA } },
    orderBy: { createdAt: "desc" },
  });

  const otro = (f: (typeof filas)[number]) =>
    f.solicitanteId === userId ? f.destinatario : f.solicitante;

  return {
    amigos: filas.filter((f) => f.estado === "aceptada").map((f) => ({ ...otro(f), desde: f.respondidaEn })),
    recibidas: filas
      .filter((f) => f.estado === "pendiente" && f.destinatarioId === userId)
      .map((f) => ({ id: f.id, persona: f.solicitante, cuando: f.createdAt })),
    enviadas: filas
      .filter((f) => f.estado === "pendiente" && f.solicitanteId === userId)
      .map((f) => ({ id: f.id, persona: f.destinatario, cuando: f.createdAt })),
  };
}
