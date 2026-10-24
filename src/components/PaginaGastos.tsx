"use client";

import { useState } from "react";
import { ListaGastosMes } from "@/components/ListaGastosMes";
import { ListaGastosFijos } from "@/components/ListaGastosFijos";
import { currentMonth, monthLabel } from "@/lib/format";

type Pestana = "mes" | "fijos";

/**
 * Gastos: lo cargado este mes y los gastos fijos, en una sola página con dos
 * pestañas. Ninguna tiene formulario: todo se carga desde el + (NuevoGasto),
 * que pregunta si es común o fijo. La pestaña abierta queda en la dirección
 * (?ver=fijos) para poder volver o enlazarla.
 */
export function PaginaGastos({ inicial }: { inicial: Pestana }) {
  const [pestana, setPestana] = useState<Pestana>(inicial);

  function elegir(nueva: Pestana) {
    setPestana(nueva);
    window.history.replaceState(null, "", nueva === "fijos" ? "/expenses?ver=fijos" : "/expenses");
  }

  const pestanas = [
    { id: "mes" as const, texto: "Del mes" },
    { id: "fijos" as const, texto: "Fijos" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="rotulo">{pestana === "mes" ? monthLabel(currentMonth()) : "Se cargan solos cada mes"}</p>
        <h1 className="titulo">Gastos</h1>
      </header>

      <div role="tablist" aria-label="Tipo de gasto" className="pestanas">
        {pestanas.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            id={`pestana-${p.id}`}
            aria-selected={pestana === p.id}
            aria-controls={`panel-${p.id}`}
            onClick={() => elegir(p.id)}
            className="pestana"
          >
            {p.texto}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${pestana}`} aria-labelledby={`pestana-${pestana}`}>
        {pestana === "mes" ? <ListaGastosMes /> : <ListaGastosFijos />}
      </div>
    </div>
  );
}
