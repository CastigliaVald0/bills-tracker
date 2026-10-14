import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { formatMoney } from "@/lib/format";
import { getUsdRate } from "@/lib/exchange-rate";
import { Pizarra } from "@/components/Pizarra";
import { PanelGrupo } from "@/components/PanelGrupo";

export default async function GrupoPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) redirect("/login");

  const { id } = await params;
  const [grupo, categorias, cotizacion] = await Promise.all([
    prisma.grupo.findFirst({
      where: { id, creadorId: userId },
      include: {
        secciones: { orderBy: { orden: "asc" } },
        gastos: {
          include: { category: true },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        },
      },
    }),
    prisma.category.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    getUsdRate(),
  ]);
  if (!grupo) notFound();

  const totales = { UYU: 0, USD: 0 };
  for (const gasto of grupo.gastos) totales[gasto.currency] += Number(gasto.amount);

  // Solo para DIBUJAR el mosaico: el tamaño de cada sección necesita un único
  // número, así que los dólares se llevan a pesos con la cotización guardada
  // en cada gasto. Los montos que se muestran no se suman nunca.
  const tasaDeRespaldo = cotizacion?.venta ?? 40;

  const archivado = grupo.archivadoEn !== null;
  const cantidad = grupo.gastos.length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Link
          href="/grupos"
          className="rotulo flex items-center gap-1.5 self-start transition-colors hover:text-texto"
        >
          <span aria-hidden>←</span> Gastos grupales
        </Link>

        <Pizarra
          rotulo={archivado ? "Grupo archivado" : "Gastado en el grupo"}
          titulo={grupo.nombre}
          pesos={formatMoney(totales.UYU, "UYU")}
          dolares={formatMoney(totales.USD, "USD")}
          pie={
            grupo.descripcion || cantidad > 0 ? (
              <p className="border-t border-pizarra-borde px-5 py-3 text-sm text-pizarra-suave sm:px-7">
                {[grupo.descripcion, cantidad > 0 && `${cantidad} ${cantidad === 1 ? "gasto" : "gastos"}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : undefined
          }
        />
      </div>

      <PanelGrupo
        grupo={{
          id: grupo.id,
          nombre: grupo.nombre,
          color: grupo.color,
          archivado,
          usaSecciones: grupo.usaSecciones,
        }}
        secciones={grupo.secciones.map((s) => ({ id: s.id, nombre: s.nombre }))}
        categorias={categorias.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
        gastos={grupo.gastos.map((g) => ({
          id: g.id,
          monto: Number(g.amount),
          moneda: g.currency,
          fecha: g.date.toISOString(),
          descripcion: g.description,
          categoria: g.category.name,
          seccionId: g.seccionId,
          enPesos:
            g.currency === "UYU"
              ? Number(g.amount)
              : Number(g.amount) * (g.usdRate ? Number(g.usdRate) : tasaDeRespaldo),
        }))}
      />
    </div>
  );
}
