import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type StepName =
  | "competencia"
  | "publico_objetivo"
  | "modelo_negocio"
  | "estrategia_lanzamiento"
  | "veredicto";

export const STEP_ORDER: StepName[] = [
  "competencia",
  "publico_objetivo",
  "modelo_negocio",
  "estrategia_lanzamiento",
  "veredicto",
];

/**
 * Envuelve un agente con el ciclo de vida común: marca "running" en
 * validation_steps, corre la función, y persiste "done"/"failed" según el
 * resultado. Todos los agentes comparten esto para no repetir el
 * try/catch + upsert en cada uno.
 */
export async function runStep<T>(
  validationId: string,
  stepName: StepName,
  fn: () => Promise<{ result: T; sources?: unknown }>,
): Promise<T> {
  const supabase = createAdminClient();

  await supabase.from("validation_steps").upsert(
    { validation_id: validationId, step_name: stepName, status: "running" },
    { onConflict: "validation_id,step_name" },
  );

  try {
    const { result, sources } = await fn();

    await supabase.from("validation_steps").upsert(
      {
        validation_id: validationId,
        step_name: stepName,
        status: "done",
        result,
        sources: sources ?? null,
      },
      { onConflict: "validation_id,step_name" },
    );

    return result;
  } catch (error) {
    await supabase.from("validation_steps").upsert(
      {
        validation_id: validationId,
        step_name: stepName,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      },
      { onConflict: "validation_id,step_name" },
    );
    throw error;
  }
}
