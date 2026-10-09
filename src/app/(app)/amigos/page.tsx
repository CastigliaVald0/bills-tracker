import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { codigoDe, panelDeAmigos } from "@/lib/amigos-db";
import { PanelAmigos } from "@/components/PanelAmigos";

export default async function AmigosPage() {
  const userId = await requireUserId();
  if (!userId) redirect("/login");

  const [codigo, panel, usuario, cabeceras] = await Promise.all([
    codigoDe(userId),
    panelDeAmigos(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { buscablePorNombre: true } }),
    headers(),
  ]);

  // El enlace se arma con el host de la petición: así sirve igual en local,
  // en una vista previa y en producción, sin una variable de entorno más.
  const host = cabeceras.get("x-forwarded-host") ?? cabeceras.get("host") ?? "";
  const protocolo = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const enlace = `${protocolo}://${host}/invitacion/${codigo}`;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="rotulo">Para compartir gastos más adelante</p>
        <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-texto">Amigos</h1>
      </header>

      <PanelAmigos
        codigo={codigo}
        enlace={enlace}
        buscable={usuario?.buscablePorNombre ?? false}
        amigos={panel.amigos}
        recibidas={panel.recibidas}
        enviadas={panel.enviadas}
      />
    </div>
  );
}
