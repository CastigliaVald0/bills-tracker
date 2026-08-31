import { auth } from "@/auth";
import { SignOutButton } from "@/components/SignOutButton";
import { NavLinks } from "@/components/NavLinks";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-slate-50 pb-20 dark:bg-slate-950 sm:pb-0">
      <header className="hidden border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:block">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-slate-900 dark:text-slate-100">Bills Tracker</span>
            <nav className="flex items-center gap-4">
              <NavLinks menuDirection="down" />
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{session?.user?.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 flex items-center justify-around border-t border-slate-200 bg-white py-2 dark:border-slate-800 dark:bg-slate-900 sm:hidden">
        <NavLinks menuDirection="up" />
      </nav>
    </div>
  );
}
