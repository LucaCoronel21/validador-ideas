import "server-only";
import { getAIProvider } from "@/lib/ai";
import { runStep } from "./step-runner";

export interface PublicoObjetivoInput {
  idea: string;
  rubro?: string | null;
  pais?: string | null;
  mercado?: string | null;
}

export interface Segmento {
  nombre: string;
  descripcion: string;
  dolores: string[];
  donde_encontrarlos: string[];
}

export interface PublicoObjetivoResult {
  segmentos: Segmento[];
}

const SCHEMA = {
  type: "object",
  properties: {
    segmentos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nombre: { type: "string" },
          descripcion: { type: "string" },
          dolores: { type: "array", items: { type: "string" } },
          donde_encontrarlos: { type: "array", items: { type: "string" } },
        },
        required: ["nombre", "descripcion", "dolores", "donde_encontrarlos"],
      },
    },
  },
  required: ["segmentos"],
};

const SYSTEM_PROMPT = `Sos un especialista en investigación de usuarios. Identificás segmentos de público objetivo concretos y accionables para una idea de negocio, con sus dolores principales y canales reales donde encontrarlos (comunidades, redes, eventos, etc.), no genéricos.`;

export async function runPublicoObjetivoAgent(
  validationId: string,
  input: PublicoObjetivoInput,
): Promise<PublicoObjetivoResult> {
  return runStep(validationId, "publico_objetivo", async () => {
    const prompt = `Idea de negocio: ${input.idea}
${input.rubro ? `Rubro: ${input.rubro}` : ""}
${input.pais ? `País: ${input.pais}` : ""}
${input.mercado ? `Mercado objetivo declarado por el usuario: ${input.mercado}` : ""}

Identificá 2 a 4 segmentos de público objetivo para esta idea.`;

    const result = await getAIProvider().generateStructured<PublicoObjetivoResult>({
      systemPrompt: SYSTEM_PROMPT,
      prompt,
      schema: SCHEMA,
    });

    return { result };
  });
}
