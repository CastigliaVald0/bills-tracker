import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/require-user";
import { PaginaGastos, type Pestana } from "@/components/PaginaGastos";
import { ListaGrupos } from "@/components/ListaGrupos";

export default async function ExpensesPage({ searchParams }: PageProps<"/expenses">) {
  const userId = await requireUserId();
  if (!userId) redirect("/login");

  const { ver } = await searchParams;
  const inicial: Pestana = ver === "fijos" ? "fijos" : ver === "grupales" ? "grupales" : "comunes";
  // Los grupos se arman en el servidor (como antes en /grupos) y llegan
  // hechos a la pestaña.
  return <PaginaGastos inicial={inicial} grupales={<ListaGrupos userId={userId} />} />;
}
