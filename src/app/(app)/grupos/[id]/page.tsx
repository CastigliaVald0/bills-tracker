import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { formatMoney } from "@/lib/format";
import { getUsdRate } from "@/lib/exchange-rate";
import { accesoAGrupo } from "@/lib/grupos-db";
import { panelDeAmigos } from "@/lib/amigos-db";
import { calcularSaldos, type MovimientoDeSaldo } from "@/lib/saldos";
import { Pizarra } from "@/components/Pizarra";
import { ParteEnPizarra } from "@/components/ParteEnPizarra";
import { PanelGrupo } from "@/components/PanelGrupo";
import { MetaGrupo } from "@/components/MetaGrupo";
import { AjustesGrupo } from "@/components/AjustesGrupo";
import { PersonasGrupo } from "@/components/PersonasGrupo";
import { SaldosGrupo } from "@/components/SaldosGrupo";

const nombreDe = (u: { name: string | null }) => u.name?.trim() || "Sin nombre";

export default async function GrupoPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) redirect("/login");

  const { id } = await params;
  const acceso = await accesoAGrupo(userId, id);
  if (!acceso) notFound();
  const esAdmin = acceso.rol === "admin";

  const [grupo, categorias, cotizacion, amigos] = await Promise.all([
    prisma.grupo.findUniqueOrThrow({
      where: { id },
      include: {
        creador: { select: { id: true, name: true } },
        miembros: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
        secciones: { orderBy: { orden: "asc" } },
        gastosGrupales: {
          include: {
            partes: { select: { userId: true, monto: true } },
            // La categoría de mi propia parte, para editar el gasto sin moverla.
            gastos: { where: { userId }, select: { categoryId: true } },
          },
          orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
        },
        pagos: { orderBy: { createdAt: "desc" } },
        aportes: { orderBy: [{ fecha: "desc" }, { createdAt: "desc" }] },
      },
    }),
    prisma.category.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    getUsdRate(),
    // Solo el administrador suma gente, así que solo a él le hacen falta.
    esAdmin ? panelDeAmigos(userId).then((p) => p.amigos) : Promise.resolve([]),
  ]);

  const administrador = { id: grupo.creador.id, nombre: nombreDe(grupo.creador) };
  const miembros = grupo.miembros
    .filter((m) => m.estado === "aceptado")
    .map((m) => ({ id: m.user.id, nombre: nombreDe(m.user) }));
  const invitados = grupo.miembros
    .filter((m) => m.estado === "pendiente")
    .map((m) => ({ id: m.user.id, nombre: nombreDe(m.user) }));
  const personas = [administrador, ...miembros];
  const yaEstan = new Set([...personas, ...invitados].map((p) => p.id));
  const amigosParaSumar = amigos
    .filter((a) => !yaEstan.has(a.id))
    .map((a) => ({ id: a.id, nombre: nombreDe(a) }));
  const compartido = personas.length > 1;

  const totales = { UYU: 0, USD: 0 };
  const miParte = { UYU: 0, USD: 0 };
  for (const gasto of grupo.gastosGrupales) {
    totales[gasto.moneda] += Number(gasto.monto);
    const mia = gasto.partes.find((p) => p.userId === userId);
    if (mia) miParte[gasto.moneda] += Number(mia.monto);
  }

  // Solo para DIBUJAR el mosaico: el tamaño de cada sección necesita un único
  // número, así que los dólares se llevan a pesos con la cotización guardada
  // en cada gasto. Los montos que se muestran no se suman nunca.
  const tasaDeRespaldo = cotizacion?.venta ?? 40;

  const movimientos: MovimientoDeSaldo[] = [
    ...grupo.gastosGrupales.map((g) => ({
      tipo: "gasto" as const,
      moneda: g.moneda,
      pagadorId: g.pagadorId,
      partes: g.partes.map((p) => ({ userId: p.userId, monto: Number(p.monto) })),
    })),
    ...grupo.pagos.map((p) => ({
      tipo: "pago" as const,
      moneda: p.moneda,
      deId: p.deId,
      aId: p.aId,
      monto: Number(p.monto),
    })),
  ];

  // Mi saldo en el grupo, con la misma cuenta que usa la pestaña de saldos:
  // positivo, me deben; negativo, debo.
  const saldos = calcularSaldos(movimientos);
  const miSaldo = { UYU: saldos.UYU.get(userId) ?? 0, USD: saldos.USD.get(userId) ?? 0 };

  const archivado = grupo.archivadoEn !== null;
  const metaMonto = grupo.metaMonto === null ? null : Number(grupo.metaMonto);
  const cantidad = grupo.gastosGrupales.length;

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
            <>
              {/* Arriba lo que gastó el grupo; acá lo tuyo, que es lo que
                  cuenta en tu mes. En un grupo propio sería el mismo número. */}
              {compartido && cantidad > 0 && <ParteEnPizarra mia={miParte} />}
              {(grupo.descripcion || cantidad > 0) && (
                <p className="border-t border-pizarra-borde px-5 py-3 text-sm text-pizarra-suave sm:px-7">
                  {[grupo.descripcion, cantidad > 0 && `${cantidad} ${cantidad === 1 ? "gasto" : "gastos"}`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </>
          }
        />
      </div>

      {/* La meta de ahorro, si el grupo tiene: lo que juntan entre todos. */}
      {metaMonto !== null && (
        <MetaGrupo
          grupoId={grupo.id}
          yo={userId}
          esAdmin={esAdmin}
          archivado={archivado}
          personas={personas}
          meta={metaMonto}
          moneda={grupo.metaMoneda}
          aportes={grupo.aportes.map((a) => ({
            id: a.id,
            userId: a.userId,
            monto: Number(a.monto),
            fecha: a.fecha.toISOString(),
            registradoPorId: a.registradoPorId,
          }))}
        />
      )}

      <PanelGrupo
        grupo={{
          id: grupo.id,
          nombre: grupo.nombre,
          descripcion: grupo.descripcion,
          color: grupo.color,
          archivado,
          usaSecciones: grupo.usaSecciones,
        }}
        yo={userId}
        esAdmin={esAdmin}
        personas={personas}
        secciones={grupo.secciones.map((s) => ({ id: s.id, nombre: s.nombre, color: s.color, emoji: s.emoji }))}
        categorias={categorias.map((c) => ({ id: c.id, name: c.name, color: c.color, emoji: c.emoji }))}
        gastos={grupo.gastosGrupales.map((g) => {
          const mia = g.partes.find((p) => p.userId === userId);
          return {
            id: g.id,
            monto: Number(g.monto),
            moneda: g.moneda,
            fecha: g.fecha.toISOString(),
            descripcion: g.descripcion,
            seccionId: g.seccionId,
            pagadorId: g.pagadorId,
            cargadoPorId: g.cargadoPorId,
            personasEnReparto: g.partes.length,
            miParte: mia ? Number(mia.monto) : null,
            partes: g.partes.map((p) => ({ userId: p.userId, monto: Number(p.monto) })),
            miCategoriaId: g.gastos[0]?.categoryId ?? null,
            enPesos:
              g.moneda === "UYU" ? Number(g.monto) : Number(g.monto) * (g.usdRate ? Number(g.usdRate) : tasaDeRespaldo),
          };
        })}
        miSaldo={compartido ? miSaldo : null}
        pagos={grupo.pagos.map((p) => ({
          deId: p.deId,
          aId: p.aId,
          monto: Number(p.monto),
          moneda: p.moneda,
          fecha: p.fecha.toISOString(),
        }))}
        saldos={
          compartido ? (
            <SaldosGrupo
              grupoId={grupo.id}
              yo={userId}
              personas={personas}
              movimientos={movimientos}
              pagos={grupo.pagos.map((p) => ({
                id: p.id,
                deId: p.deId,
                aId: p.aId,
                monto: Number(p.monto),
                moneda: p.moneda,
                fecha: p.fecha.toISOString(),
              }))}
            />
          ) : undefined
        }
        // Los ajustes, en una tuerca al final de la pestaña Grupo (solo el
        // administrador).
        ajustes={
          esAdmin ? (
            <AjustesGrupo
              grupo={{
                id: grupo.id,
                nombre: grupo.nombre,
                descripcion: grupo.descripcion,
                color: grupo.color,
                archivado,
                usaSecciones: grupo.usaSecciones,
              }}
              metaMonto={metaMonto}
              metaMoneda={grupo.metaMoneda}
              hayAportes={grupo.aportes.length > 0}
              personas={personas.length}
              cantidadGastos={cantidad}
            />
          ) : undefined
        }
        personasDelGrupo={
          // Un grupo propio no muestra personas hasta que se suma alguien: el
          // administrador las suma desde acá.
          compartido || invitados.length > 0 || (esAdmin && !archivado) ? (
            <PersonasGrupo
              grupoId={grupo.id}
              yo={userId}
              esAdmin={esAdmin}
              archivado={archivado}
              administrador={administrador}
              miembros={miembros}
              invitados={invitados}
              amigosParaSumar={amigosParaSumar}
            />
          ) : undefined
        }
      />
    </div>
  );
}
