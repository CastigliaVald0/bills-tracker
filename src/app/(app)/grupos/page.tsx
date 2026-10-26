import { redirect } from "next/navigation";

// Los grupos pasaron a ser la pestaña "Grupales" de Gastos.
export default function GruposPage() {
  redirect("/expenses?ver=grupales");
}
