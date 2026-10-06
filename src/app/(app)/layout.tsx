import Link from "next/link";
import { auth } from "@/auth";
import { UserMenu } from "@/components/UserMenu";
import { NavLinks, ConversorLink } from "@/components/NavLinks";
import { Marca } from "@/components/Marca";
import { BarraFlotante } from "@/components/BarraFlotante";
import { ActivarNotificaciones } from "@/components/ActivarNotificaciones";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-fondo pb-24 sm:pb-0">
      <header className="hidden border-b border-borde bg-superficie px-4 sm:block">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-6">
          <div className="flex items-center gap-7">
            <Marca />
            <nav className="flex items-center gap-5">
              <NavLinks menuDirection="down" />
              <ConversorLink />
            </nav>
          </div>
          <UserMenu name={session?.user?.name} email={session?.user?.email} menuDirection="down" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">{children}</main>

      <ActivarNotificaciones />

      {/* Barra flotante del celular: una pastilla despegada de los bordes, con
          el alta de gastos en el centro, la navegación a la izquierda y la
          cuenta a la derecha. Las columnas de los costados miden lo mismo para
          que el botón central quede justo en el medio.

          El botón es más grande que la barra y sobresale hacia arriba. El fondo
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
          <NavLinks menuDirection="up" />
        </div>
        {/* Reserva el ancho del recorte; el botón va posicionado encima. */}
        <span aria-hidden className="w-[76px]" />
        <Link
          href="/expenses"
          aria-label="Agregar gasto"
          title="Agregar gasto"
          className="boton-central absolute left-1/2 top-1/2 flex h-16 w-16 items-center justify-center rounded-full bg-accion text-accion-texto shadow-lg shadow-black/25 transition-colors hover:bg-accion-alta"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            className="h-7 w-7"
            aria-hidden
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
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
