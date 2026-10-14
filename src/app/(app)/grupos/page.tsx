import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { formatMoney } from "@/lib/format";
import { Vacio } from "@/components/Vacio";
import { IconoGrupo } from "@/components/navegacion";

export default async function GruposPage() {
  const userId = await requireUserId();
  if (!userId) redirect("/login");

  const [grupos, sumas] = await Promise.all([
    prisma.grupo.findMany({
      where: { creadorId: userId },
      include: { _count: { select: { secciones: true, gastos: true } } },
      orderBy: { createdAt: "desc" },
    }),
    // Los totales de todos los grupos en una sola consulta, por grupo y moneda.
    prisma.expense.groupBy({
      by: ["grupoId", "currency"],
      where: { userId, grupoId: { not: null } },
      _sum: { amount: true },
    }),
  ]);

  const totales = new Map<string, { UYU: number; USD: number }>();
  for (const suma of sumas) {
    if (!suma.grupoId) continue;
    const total = totales.get(suma.grupoId) ?? { UYU: 0, USD: 0 };
    total[suma.currency] = Number(suma._sum.amount ?? 0);
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
                <TarjetaGrupo key={grupo.id} grupo={grupo} total={totales.get(grupo.id)} />
              ))}
            </ul>
          )}

          {archivados.length > 0 && (
            <section>
              <h2 className="rotulo mb-3">Archivados</h2>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {archivados.map((grupo) => (
                  <TarjetaGrupo key={grupo.id} grupo={grupo} total={totales.get(grupo.id)} archivado />
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
  archivado = false,
}: {
  grupo: {
    id: string;
    nombre: string;
    color: string;
    descripcion: string | null;
    _count: { secciones: number; gastos: number };
  };
  total?: { UYU: number; USD: number };
  archivado?: boolean;
}) {
  const { gastos, secciones } = grupo._count;
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
