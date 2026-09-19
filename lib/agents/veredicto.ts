import "server-only";
import { getAIProvider } from "@/lib/ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { runStep } from "./step-runner";
import type { CompetenciaResult } from "./competencia";
import type { PublicoObjetivoResult } from "./publico-objetivo";
import type { ModeloNegocioResult } from "./modelo-negocio";
import type { EstrategiaLanzamientoResult } from "./estrategia-lanzamiento";

export interface VeredictoInput {
  idea: string;
  competencia: CompetenciaResult;
  publicoObjetivo: PublicoObjetivoResult;
  modeloNegocio: ModeloNegocioResult;
  estrategiaLanzamiento: EstrategiaLanzamientoResult;
}

export interface VeredictoResult {
  puntaje_viabilidad: number;
  justificacion: string;
  principales_riesgos: string[];
}

const SCHEMA = {
  type: "object",
  properties: {
    puntaje_viabilidad: { type: "integer", minimum: 1, maximum: 10 },
    justificacion: { type: "string" },
    principales_riesgos: { type: "array", items: { type: "string" } },
  },
  required: ["puntaje_viabilidad", "justificacion", "principales_riesgos"],
};

const SYSTEM_PROMPT = `Sos un evaluador crítico de ideas de negocio. Das un puntaje de viabilidad del 1 al 10 (10 = muy viable) basado en la evidencia real de competencia, público objetivo, modelo de negocio y estrategia de lanzamiento ya analizados. Sé exigente: un mercado saturado con competidores fuertes y sin diferenciador claro debe bajar el puntaje. Justificá el número y listá los riesgos principales, concretos.`;

export async function runVeredictoAgent(
  validationId: string,
  input: VeredictoInput,
): Promise<VeredictoResult> {
  const result = await runStep(validationId, "veredicto", async () => {
    const prompt = `Idea de negocio: ${input.idea}

Competencia: ${input.competencia.resumen} (${input.competencia.competidores.length} competidores identificados)
Público objetivo: ${input.publicoObjetivo.segmentos.map((s) => s.nombre).join(", ")}
Modelo de negocio: ${input.modeloNegocio.hipotesis_precio}
Estrategia de lanzamiento: MVP: ${input.estrategiaLanzamiento.mvp_minimo}

Dá el veredicto final.`;

    const generated = await getAIProvider().generateStructured<VeredictoResult>({
      systemPrompt: SYSTEM_PROMPT,
      prompt,
      schema: SCHEMA,
    });

    return { result: generated };
  });

  const supabase = createAdminClient();
  await supabase
    .from("validations")
    .update({ viability_score: result.puntaje_viabilidad, status: "done" })
    .eq("id", validationId);

  return result;
}
