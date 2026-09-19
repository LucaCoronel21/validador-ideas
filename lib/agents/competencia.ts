import "server-only";
import { getAIProvider } from "@/lib/ai";
import { searchWeb } from "@/lib/search/tavily";
import { runStep } from "./step-runner";

export interface CompetenciaInput {
  idea: string;
  rubro?: string | null;
  pais?: string | null;
}

export interface Competidor {
  nombre: string;
  descripcion: string;
  url: string;
  diferenciador: string;
}

export interface CompetenciaResult {
  resumen: string;
  competidores: Competidor[];
}

const SCHEMA = {
  type: "object",
  properties: {
    resumen: { type: "string" },
    competidores: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nombre: { type: "string" },
          descripcion: { type: "string" },
          url: { type: "string" },
          diferenciador: { type: "string" },
        },
        required: ["nombre", "descripcion", "url", "diferenciador"],
      },
    },
  },
  required: ["resumen", "competidores"],
};

const SYSTEM_PROMPT = `Sos un analista de mercado. Tu única fuente de información son los resultados de búsqueda web que se te dan en el prompt.
NUNCA menciones un competidor que no aparezca en esos resultados. Cada competidor que menciones debe usar una de las URLs provistas, exactamente como aparece, como valor de "url".
Si los resultados no alcanzan para identificar competidores reales, decilo en el resumen y devolvé una lista vacía en "competidores" en vez de inventar.`;

/**
 * Único agente del pipeline que hace búsqueda web real (los demás razonan
 * sobre el input y los resúmenes de pasos previos). Es la pieza central
 * del requisito de "nada inventado".
 */
export async function runCompetenciaAgent(
  validationId: string,
  input: CompetenciaInput,
): Promise<CompetenciaResult> {
  return runStep(validationId, "competencia", async () => {
    const query = [input.idea, input.rubro, input.pais, "competidores"]
      .filter(Boolean)
      .join(" ");

    const searchResults = await searchWeb(query);

    if (searchResults.length === 0) {
      throw new Error("La búsqueda web no devolvió resultados.");
    }

    const prompt = `Idea de negocio: ${input.idea}
${input.rubro ? `Rubro: ${input.rubro}` : ""}
${input.pais ? `País: ${input.pais}` : ""}

Resultados de búsqueda web (única fuente permitida):
${searchResults
  .map((r, i) => `${i + 1}. ${r.title} — ${r.url}\n${r.content}`)
  .join("\n\n")}

Identificá competidores reales de esta idea usando SOLO estos resultados.`;

    const result = await getAIProvider().generateStructured<CompetenciaResult>({
      systemPrompt: SYSTEM_PROMPT,
      prompt,
      schema: SCHEMA,
    });

    return { result, sources: searchResults };
  });
}
