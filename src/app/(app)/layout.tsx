import { auth } from "@/auth";
import { UserMenu } from "@/components/UserMenu";
import { NavLinks, ConversorLink } from "@/components/NavLinks";
import { CajonMenu } from "@/components/CajonMenu";
import Link from "next/link";
import { Marca } from "@/components/Marca";
import { BotonAgregar } from "@/components/BotonAgregar";
import { BarraFlotante } from "@/components/BarraFlotante";
import { ActivarNotificaciones } from "@/components/ActivarNotificaciones";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-fondo pb-24 sm:pb-0">
      {/* En PC la navegación vive en un cajón que entra por la izquierda. Las
          tres barritas van antes del nombre, que es de donde se las espera, y
          el nombre lleva al inicio. Así la cabecera queda con lo justo y el
          menú tiene lugar para agrupar las siete pantallas. */}
      <header className="hidden border-b border-borde bg-superficie px-4 sm:block">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <CajonMenu />
            <Link href="/dashboard" aria-label="Inicio" className="rounded-sm">
              <Marca />
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {/* La acción principal, con nombre y en todas las pantallas. Antes
                era un círculo flotante abajo a la derecha que solo existía en
                el dashboard y, a diferencia del + del celular, no ofrecía
                elegir entre gasto y gasto fijo: iba derecho a /expenses. */}
            <Link href="/expenses" className="boton py-1.5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="h-4 w-4"
                aria-hidden
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Cargar gasto
            </Link>
            {/* El conversor salió de la cabecera: se usa de vez en cuando, no
                todos los días, y vive en el cajón bajo Herramientas. */}
            <UserMenu name={session?.user?.name} email={session?.user?.email} menuDirection="down" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">{children}</main>

      <ActivarNotificaciones />

      {/* Barra flotante del celular: una pastilla despegada de los bordes, con
          el alta de gastos en el centro, la navegación a la izquierda y la
          cuenta a la derecha. Las columnas de los costados miden lo mismo para
          que el botón central quede justo en el medio.

          El botón (BotonAgregar) es más grande que la barra, sobresale hacia
          arriba y al tocarlo despliega los dos tipos de gasto. El fondo
          va en capas aparte (ver .barra-muesca) porque lleva un recorte
          circular alrededor del botón: si el recorte se aplicara a la barra
          entera, también cortaría el botón y los menús que se abren arriba. */}
      <BarraFlotante>
        <div aria-hidden className="absolute inset-0 -z-10 drop-shadow-[0_6px_14px_rgb(0_0_0/0.16)]">
          {/* Dos capas con el mismo recorte, la de adentro 1px más chica: lo que
              asoma de la de atrás es el borde, que así sigue también la curva. */}
          <div className="barra-muesca absolute inset-0 rounded-full bg-borde" />
          <div className="barra-muesca barra-muesca-interior absolute inset-px rounded-full bg-superficie" />
        </div>

        <div className="flex items-center justify-around">
          <NavLinks />
        </div>
        {/* Reserva el ancho del recorte; el botón va posicionado encima. */}
        <span aria-hidden className="w-[76px]" />
        <BotonAgregar />
        {/* Espejo del lado izquierdo: el conversor y después la cuenta, que
            queda a la misma distancia del borde que la casa. */}
        <div className="flex items-center justify-around">
          <ConversorLink flotante />
          <div className="flex w-14 justify-center">
            <UserMenu name={session?.user?.name} email={session?.user?.email} menuDirection="up" />
          </div>
        </div>
      </BarraFlotante>
    </div>
  );
}
