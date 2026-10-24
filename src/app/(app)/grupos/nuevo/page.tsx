import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/require-user";
import { AsistenteGrupo } from "@/components/AsistenteGrupo";

export default async function NuevoGrupoPage() {
  const userId = await requireUserId();
  if (!userId) redirect("/login");

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="rotulo">Nombre, color, secciones y meta</p>
        <h1 className="titulo">Nuevo grupo</h1>
      </header>

      <AsistenteGrupo />
    </div>
  );
}
