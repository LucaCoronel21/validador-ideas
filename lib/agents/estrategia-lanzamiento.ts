import "server-only";
import { getAIProvider } from "@/lib/ai";
import { runStep } from "./step-runner";
import type { CompetenciaResult } from "./competencia";
import type { PublicoObjetivoResult } from "./publico-objetivo";
import type { ModeloNegocioResult } from "./modelo-negocio";

export interface EstrategiaLanzamientoInput {
  idea: string;
  competencia: CompetenciaResult;
  publicoObjetivo: PublicoObjetivoResult;
  modeloNegocio: ModeloNegocioResult;
}

export interface EstrategiaLanzamientoResult {
  mvp_minimo: string;
  primer_canal: string;
  primeros_100_usuarios: string;
}

const SCHEMA = {
  type: "object",
  properties: {
    mvp_minimo: { type: "string" },
    primer_canal: { type: "string" },
    primeros_100_usuarios: { type: "string" },
  },
  required: ["mvp_minimo", "primer_canal", "primeros_100_usuarios"],
};

const SYSTEM_PROMPT = `Sos un asesor de lanzamiento de productos (go-to-market). Proponés el MVP más chico posible que ya sea vendible, un único canal principal para el lanzamiento (no una lista de opciones), y un plan concreto para conseguir los primeros 100 usuarios sin presupuesto de marketing.`;

export async function runEstrategiaLanzamientoAgent(
  validationId: string,
  input: EstrategiaLanzamientoInput,
): Promise<EstrategiaLanzamientoResult> {
  return runStep(validationId, "estrategia_lanzamiento", async () => {
    const prompt = `Idea de negocio: ${input.idea}

Competencia: ${input.competencia.resumen}
Público objetivo: ${input.publicoObjetivo.segmentos.map((s) => s.nombre).join(", ")}
Modelo de negocio: fuentes de ingreso: ${input.modeloNegocio.fuentes_ingreso.join(", ")}; precio: ${input.modeloNegocio.hipotesis_precio}

Proponé la estrategia de lanzamiento.`;

    const result = await getAIProvider().generateStructured<EstrategiaLanzamientoResult>({
      systemPrompt: SYSTEM_PROMPT,
      prompt,
      schema: SCHEMA,
    });

    return { result };
  });
}
