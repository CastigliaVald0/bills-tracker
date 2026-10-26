"use client";

import { useState } from "react";
import { ListaGastosMes } from "@/components/ListaGastosMes";
import { ListaGastosFijos } from "@/components/ListaGastosFijos";
import { currentMonth, monthLabel } from "@/lib/format";

export type Pestana = "comunes" | "fijos" | "grupales";

const DIRECCION: Record<Pestana, string> = {
  comunes: "/expenses",
  fijos: "/expenses?ver=fijos",
  grupales: "/expenses?ver=grupales",
};

const ROTULO: Record<Pestana, string> = {
  comunes: "",
  fijos: "Se cargan solos cada mes",
  grupales: "Compartidos o de algo puntual",
};

/**
 * Gastos: los comunes del mes, los fijos y los grupos, en una sola página con
 * tres pestañas. Ninguna tiene formulario: todo se carga desde el +
 * (NuevoGasto). La pestaña abierta queda en la dirección (?ver=fijos,
 * ?ver=grupales) para poder volver o enlazarla. Los grupos llegan hechos
 * desde el servidor (`grupales`).
 */
export function PaginaGastos({ inicial, grupales }: { inicial: Pestana; grupales: React.ReactNode }) {
  const [pestana, setPestana] = useState<Pestana>(inicial);

  function elegir(nueva: Pestana) {
    setPestana(nueva);
    window.history.replaceState(null, "", DIRECCION[nueva]);
  }

  const pestanas = [
    { id: "comunes" as const, texto: "Comunes" },
    { id: "fijos" as const, texto: "Fijos" },
    { id: "grupales" as const, texto: "Grupales" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="rotulo">{pestana === "comunes" ? monthLabel(currentMonth()) : ROTULO[pestana]}</p>
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
        {pestana === "comunes" ? <ListaGastosMes /> : pestana === "fijos" ? <ListaGastosFijos /> : grupales}
      </div>
    </div>
  );
}
