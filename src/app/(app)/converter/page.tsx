import { requireUserId } from "@/lib/require-user";
import { redirect } from "next/navigation";
import { getUsdRate } from "@/lib/exchange-rate";
import { CurrencyConverter } from "@/components/CurrencyConverter";

export default async function ConverterPage() {
  const userId = await requireUserId();
  if (!userId) redirect("/login");

  const rate = await getUsdRate();

  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="rotulo">Cotización del día</p>
        <h1 className="titulo">Conversor UYU / USD</h1>
        <p className="mt-2 max-w-prose text-sm text-suave">
          Para estimar a cuántos pesos te va a salir una compra en dólares, por ejemplo en MercadoLibre.
        </p>
      </header>

      <CurrencyConverter rate={rate} />
    </div>
  );
}
