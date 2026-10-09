import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { normalizarCodigo } from "@/lib/amigos";
import { enviarSolicitud } from "@/lib/amigos-db";
import { Marca } from "@/components/Marca";

/**
 * El enlace de invitación. Lo abre cualquiera, con cuenta o sin ella.
 *
 * No manda la solicitud sola: muestra de quién es el código y pide confirmar.
 * Un enlace que ejecuta una acción con solo abrirlo se dispara con cualquier
 * previsualización de WhatsApp o del correo.
 */
export default async function InvitacionPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo: crudo } = await params;
  const codigo = normalizarCodigo(crudo);

  const anfitrion = codigo
    ? await prisma.user.findUnique({
        where: { codigoAmigo: codigo },
        select: { id: true, name: true },
      })
    : null;

  const userId = await requireUserId();

  // Invitarse a uno mismo con el propio enlace: al inicio, sin drama.
  if (anfitrion && userId === anfitrion.id) redirect("/amigos");

  const nombre = anfitrion?.name?.trim() || "Alguien";

  async function aceptar() {
    "use server";
    if (!anfitrion) return;
    const quien = await requireUserId();
    if (!quien) redirect(`/login?volverA=/invitacion/${crudo}`);
    await enviarSolicitud(quien, anfitrion.id);
    redirect("/amigos");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo px-4 py-10">
      <div className="tarjeta filo w-full max-w-sm p-6 sm:p-7">
        <Marca />

        {!anfitrion ? (
          <>
            <h1 className="mt-5 text-lg font-semibold tracking-tight text-texto">
              Esta invitación no sirve
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-suave">
              El código no existe o fue cambiado. Pedile a quien te invitó que te
              mande el enlace de nuevo.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-lg font-semibold tracking-tight text-texto">
              {nombre} te quiere agregar
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-suave">
              Billions Tracker es para llevar los gastos del mes en pesos y dólares.
              Agregarse como amigos no comparte nada todavía: es el primer paso para
              poder dividir gastos más adelante.
            </p>

            {userId ? (
              <form action={aceptar} className="mt-6">
                <button type="submit" className="boton w-full">
                  Mandarle solicitud a {nombre}
                </button>
              </form>
            ) : (
              <div className="mt-6 flex flex-col gap-2">
                <Link href={`/register?invitacion=${codigo}`} className="boton w-full">
                  Crear mi cuenta
                </Link>
                <Link
                  href={`/login?volverA=${encodeURIComponent(`/invitacion/${codigo}`)}`}
                  className="boton-linea w-full"
                >
                  Ya tengo cuenta
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
