import { redirect } from "next/navigation";

// Los gastos fijos pasaron a ser una pestaña de Gastos.
export default function RecurringPage() {
  redirect("/expenses?ver=fijos");
}
