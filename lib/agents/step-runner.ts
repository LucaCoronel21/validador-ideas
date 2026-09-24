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
 * try/catch + update en cada uno.
 *
 * Usa UPDATE (no upsert): la fila ya existe siempre, la crea
 * POST /api/validations antes de encolar el primer paso. Un upsert acá
 * reconstruye el candidate row del INSERT internamente aunque termine
 * en UPDATE por el conflicto, y eso rompe si hay columnas NOT NULL sin
 * default que no estén en el payload (ver user_id, migración 0005) —
 * silencioso si además no se chequea el error de la escritura.
 */
export async function runStep<T>(
  validationId: string,
  stepName: StepName,
  fn: () => Promise<{ result: T; sources?: unknown }>,
): Promise<T> {
  const supabase = createAdminClient();

  const { error: runningError } = await supabase
    .from("validation_steps")
    .update({ status: "running" })
    .eq("validation_id", validationId)
    .eq("step_name", stepName);
  if (runningError) throw runningError;

  try {
    const { result, sources } = await fn();

    const { error: doneError } = await supabase
      .from("validation_steps")
      .update({ status: "done", result, sources: sources ?? null })
      .eq("validation_id", validationId)
      .eq("step_name", stepName);
    if (doneError) throw doneError;

    return result;
  } catch (error) {
    const { error: failedError } = await supabase
      .from("validation_steps")
      .update({
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      })
      .eq("validation_id", validationId)
      .eq("step_name", stepName);
    if (failedError) {
      console.error("No se pudo persistir el estado 'failed':", failedError);
    }
    throw error;
  }
}
