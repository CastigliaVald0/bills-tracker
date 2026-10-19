import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { formatMoney } from "@/lib/format";
import { Vacio } from "@/components/Vacio";
import { IconoGrupo } from "@/components/navegacion";
import { ResponderInvitacion } from "@/components/ResponderInvitacion";

export default async function GruposPage() {
  const userId = await requireUserId();
  if (!userId) redirect("/login");

  const [grupos, invitaciones] = await Promise.all([
    // Los que armé y aquellos de los que soy miembro.
    prisma.grupo.findMany({
      where: { OR: [{ creadorId: userId }, { miembros: { some: { userId, estado: "aceptado" } } }] },
      include: {
        _count: { select: { secciones: true, gastosGrupales: true } },
        creador: { select: { name: true } },
        miembros: { where: { estado: "aceptado" }, select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.miembroGrupo.findMany({
      where: { userId, estado: "pendiente" },
      include: { grupo: { select: { id: true, nombre: true, color: true } }, invitadoPor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Lo gastado por cada grupo entero, no solo mi parte: es el total del grupo.
  const sumas = await prisma.gastoGrupal.groupBy({
    by: ["grupoId", "moneda"],
    where: { grupoId: { in: grupos.map((g) => g.id) } },
    _sum: { monto: true },
  });
  const totales = new Map<string, { UYU: number; USD: number }>();
  for (const suma of sumas) {
    const total = totales.get(suma.grupoId) ?? { UYU: 0, USD: 0 };
    total[suma.moneda] = Number(suma._sum.monto ?? 0);
    totales.set(suma.grupoId, total);
  }

  const activos = grupos.filter((g) => !g.archivadoEn);
  const archivados = grupos.filter((g) => g.archivadoEn);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rotulo">Los gastos de algo puntual, juntos</p>
          <h1 className="titulo">Gastos grupales</h1>
        </div>
        {grupos.length > 0 && (
          <Link href="/grupos/nuevo" className="boton">
            Nuevo grupo
          </Link>
        )}
      </header>

      {invitaciones.length > 0 && <Invitaciones invitaciones={invitaciones} />}

      {grupos.length === 0 ? (
        <Vacio
          icono={<IconoGrupo className="h-[22px] w-[22px]" />}
          titulo="Todavía no tenés gastos grupales"
          detalle="Un grupo junta todo lo que gastás en algo puntual, como la obra de una casa, y lo separa por secciones. Cada gasto sigue contando en tu mes."
          accion={{ href: "/grupos/nuevo", texto: "Armar un grupo" }}
        />
      ) : (
        <>
          {activos.length > 0 && (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {activos.map((grupo) => (
                <TarjetaGrupo
                  key={grupo.id}
                  grupo={grupo}
                  total={totales.get(grupo.id)}
                  deOtro={grupo.creadorId !== userId}
                />
              ))}
            </ul>
          )}

          {archivados.length > 0 && (
            <section>
              <h2 className="seccion-titulo mb-3 px-1">Archivados</h2>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {archivados.map((grupo) => (
                  <TarjetaGrupo
                    key={grupo.id}
                    grupo={grupo}
                    total={totales.get(grupo.id)}
                    deOtro={grupo.creadorId !== userId}
                    archivado
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function TarjetaGrupo({
  grupo,
  total,
  deOtro = false,
  archivado = false,
}: {
  grupo: {
    id: string;
    nombre: string;
    color: string;
    descripcion: string | null;
    creador: { name: string | null };
    miembros: { id: string }[];
    _count: { secciones: number; gastosGrupales: number };
  };
  total?: { UYU: number; USD: number };
  /** Si el grupo lo armó otro y yo soy miembro. */
  deOtro?: boolean;
  archivado?: boolean;
}) {
  const { gastosGrupales: gastos, secciones } = grupo._count;
  const personas = grupo.miembros.length + 1;
  const color = archivado ? "var(--texto-tenue)" : grupo.color;

  return (
    <li>
      <Link
        href={`/grupos/${grupo.id}`}
        className="tarjeta group relative flex h-full flex-col overflow-hidden p-4 pl-5 transition-colors hover:border-borde-fuerte"
      >
        {/* el color del grupo, como el filete de las categorías */}
        <span aria-hidden className="filete" style={{ backgroundColor: color }} />

        <p className={`text-base font-semibold tracking-tight ${archivado ? "text-suave" : "text-texto"}`}>
          {grupo.nombre}
        </p>
        <p className="mt-1 text-xs text-tenue">
          {gastos} {gastos === 1 ? "gasto" : "gastos"}
          {secciones > 0 && ` · ${secciones} ${secciones === 1 ? "sección" : "secciones"}`}
          {personas > 1 && ` · ${personas} personas`}
          {deOtro && ` · de ${grupo.creador.name?.trim() || "un amigo"}`}
        </p>

        <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-borde pt-3">
          {total && (total.UYU > 0 || total.USD > 0) ? (
            <>
              {total.UYU > 0 && (
                <span className="monto text-sm text-peso">{formatMoney(total.UYU, "UYU")}</span>
              )}
              {total.USD > 0 && (
                <span className="monto text-sm text-dolar">{formatMoney(total.USD, "USD")}</span>
              )}
            </>
          ) : (
            <span className="text-sm text-tenue">Sin gastos todavía</span>
          )}
          <span aria-hidden className="ml-auto text-tenue transition-colors group-hover:text-texto">
            →
          </span>
        </div>
      </Link>
    </li>
  );
}

/** Las invitaciones a grupos que todavía no respondí: van arriba de todo. */
function Invitaciones({
  invitaciones,
}: {
  invitaciones: {
    id: string;
    grupo: { id: string; nombre: string; color: string };
    invitadoPor: { name: string | null };
  }[];
}) {
  return (
    <section>
      <h2 className="seccion-titulo mb-3 px-1">Te invitaron</h2>
      <ul className="lista">
        {invitaciones.map((inv) => (
          <li key={inv.id} className="fila flex-wrap">
            <span aria-hidden className="filete" style={{ backgroundColor: inv.grupo.color }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-texto">{inv.grupo.nombre}</p>
              <p className="mt-0.5 truncate text-xs text-tenue">
                {inv.invitadoPor.name?.trim() || "Un amigo"} te sumó para cargar gastos juntos
              </p>
            </div>
            <ResponderInvitacion grupoId={inv.grupo.id} />
          </li>
        ))}
      </ul>
    </section>
  );
}
