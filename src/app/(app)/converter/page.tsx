import { requireUserId } from "@/lib/require-user";
import { redirect } from "next/navigation";
import { getLatestUsdRate } from "@/lib/bcu";
import { CurrencyConverter } from "@/components/CurrencyConverter";

export default async function ConverterPage() {
  const userId = await requireUserId();
  if (!userId) redirect("/login");

  const rate = await getLatestUsdRate();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Conversor UYU / USD</h1>
        <p className="text-sm text-slate-500">
          Útil para estimar a cuántos pesos te va a salir una compra en dólares (por ejemplo, en MercadoLibre).
        </p>
      </div>

      <CurrencyConverter rate={rate} />
    </div>
  );
}
