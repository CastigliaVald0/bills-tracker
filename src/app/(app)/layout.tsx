import { auth } from "@/auth";
import { UserMenu } from "@/components/UserMenu";
import { NavLinks } from "@/components/NavLinks";
import { Marca } from "@/components/Marca";

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
            </nav>
          </div>
          <UserMenu name={session?.user?.name} email={session?.user?.email} menuDirection="down" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-borde bg-superficie px-2 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] sm:hidden">
        <NavLinks menuDirection="up" />
        <UserMenu name={session?.user?.name} email={session?.user?.email} menuDirection="up" />
      </nav>
    </div>
  );
}
