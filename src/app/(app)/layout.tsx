import { auth } from "@/auth";
import { UserMenu } from "@/components/UserMenu";
import { NavLinks, ConversorLink } from "@/components/NavLinks";
import { CajonMenu } from "@/components/CajonMenu";
import Link from "next/link";
import { Marca } from "@/components/Marca";
import { BotonAgregar } from "@/components/BotonAgregar";
import { CargarGastoPc } from "@/components/CargarGastoPc";
import { ActivarNotificaciones } from "@/components/ActivarNotificaciones";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-fondo pb-24 sm:pb-0">
      {/* En PC la navegación vive en un cajón que entra por la izquierda. Las
          tres barritas van antes del nombre, que es de donde se las espera, y
          el nombre lleva al inicio. Así la cabecera queda con lo justo y el
          menú tiene lugar para agrupar las siete pantallas. */}
      <header className="sticky top-0 z-20 hidden border-b border-borde bg-fondo/80 px-4 backdrop-blur-md sm:block">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <CajonMenu />
            <Link href="/dashboard" aria-label="Inicio" className="rounded-sm">
              <Marca />
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {/* La acción principal, con nombre y en todas las pantallas. Como
                el + del celular, no va derecho a /expenses: despliega los
                tipos de gasto para elegir cuál cargar. */}
            <CargarGastoPc />
            {/* El conversor salió de la cabecera: se usa de vez en cuando, no
                todos los días, y vive en el cajón bajo Herramientas. */}
            <UserMenu name={session?.user?.name} email={session?.user?.email} menuDirection="down" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-7 sm:py-10">{children}</main>

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
      <nav className="barra-flotante fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-20 grid h-14 grid-cols-[1fr_auto_1fr] items-center px-2 sm:hidden">
        <div aria-hidden className="absolute inset-0 -z-10 drop-shadow-[0_8px_18px_rgb(0_0_0/0.45)]">
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
      </nav>
    </div>
  );
}
