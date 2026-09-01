import { Marca } from "@/components/Marca";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-fondo px-4 py-10">
      <Marca size="lg" />
      <div className="tarjeta filo aparece w-full max-w-sm p-6 sm:p-7">{children}</div>
      <p className="rotulo">Pesos y dólares, por separado</p>
    </div>
  );
}
