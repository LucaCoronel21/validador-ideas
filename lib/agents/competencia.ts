import "server-only";
import { getAIProvider } from "@/lib/ai";
import { searchWeb } from "@/lib/search/tavily";
import { createAdminClient } from "@/lib/supabase/admin";

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
 * Corre el agente de competencia para una validación existente y persiste
 * el resultado en validation_steps. Usa el cliente admin (bypassea RLS)
 * porque corre del lado del servidor, fuera del contexto de un usuario
 * autenticado con cookies.
 */
export async function runCompetenciaAgent(
  validationId: string,
  input: CompetenciaInput,
): Promise<CompetenciaResult> {
  const supabase = createAdminClient();

  await supabase.from("validation_steps").upsert(
    { validation_id: validationId, step_name: "competencia", status: "running" },
    { onConflict: "validation_id,step_name" },
  );

  try {
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

    const ai = getAIProvider();
    const result = await ai.generateStructured<CompetenciaResult>({
      systemPrompt: SYSTEM_PROMPT,
      prompt,
      schema: SCHEMA,
    });

    await supabase.from("validation_steps").upsert(
      {
        validation_id: validationId,
        step_name: "competencia",
        status: "done",
        result,
        sources: searchResults,
      },
      { onConflict: "validation_id,step_name" },
    );

    return result;
  } catch (error) {
    await supabase.from("validation_steps").upsert(
      {
        validation_id: validationId,
        step_name: "competencia",
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      },
      { onConflict: "validation_id,step_name" },
    );
    throw error;
  }
}
