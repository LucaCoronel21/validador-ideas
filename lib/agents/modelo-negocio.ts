import "server-only";
import { getAIProvider } from "@/lib/ai";
import { runStep } from "./step-runner";
import type { CompetenciaResult } from "./competencia";
import type { PublicoObjetivoResult } from "./publico-objetivo";

export interface ModeloNegocioInput {
  idea: string;
  competencia: CompetenciaResult;
  publicoObjetivo: PublicoObjetivoResult;
}

export interface ModeloNegocioResult {
  fuentes_ingreso: string[];
  estructura_costos: string[];
  hipotesis_precio: string;
}

const SCHEMA = {
  type: "object",
  properties: {
    fuentes_ingreso: { type: "array", items: { type: "string" } },
    estructura_costos: { type: "array", items: { type: "string" } },
    hipotesis_precio: { type: "string" },
  },
  required: ["fuentes_ingreso", "estructura_costos", "hipotesis_precio"],
};

const SYSTEM_PROMPT = `Sos un asesor de modelos de negocio. Proponés fuentes de ingreso y estructura de costos realistas para una idea, teniendo en cuenta cómo cobra la competencia existente y qué puede pagar el público objetivo identificado. La hipótesis de precio debe ser un número o rango concreto, no una descripción vaga.`;

export async function runModeloNegocioAgent(
  validationId: string,
  input: ModeloNegocioInput,
): Promise<ModeloNegocioResult> {
  return runStep(validationId, "modelo_negocio", async () => {
    const prompt = `Idea de negocio: ${input.idea}

Análisis de competencia (resumen): ${input.competencia.resumen}
Competidores: ${input.competencia.competidores.map((c) => `${c.nombre} (${c.diferenciador})`).join("; ")}

Segmentos de público objetivo: ${input.publicoObjetivo.segmentos
      .map((s) => `${s.nombre}: ${s.dolores.join(", ")}`)
      .join(" | ")}

Proponé el modelo de negocio.`;

    const result = await getAIProvider().generateStructured<ModeloNegocioResult>({
      systemPrompt: SYSTEM_PROMPT,
      prompt,
      schema: SCHEMA,
    });

    return { result };
  });
}
