import { PaginaGastos } from "@/components/PaginaGastos";

export default async function ExpensesPage({ searchParams }: PageProps<"/expenses">) {
  const { ver } = await searchParams;
  return <PaginaGastos inicial={ver === "fijos" ? "fijos" : "mes"} />;
}
