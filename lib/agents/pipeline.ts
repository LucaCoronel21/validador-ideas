import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { STEP_ORDER, type StepName } from "./step-runner";
import { runCompetenciaAgent, type CompetenciaResult } from "./competencia";
import { runPublicoObjetivoAgent, type PublicoObjetivoResult } from "./publico-objetivo";
import { runModeloNegocioAgent, type ModeloNegocioResult } from "./modelo-negocio";
import {
  runEstrategiaLanzamientoAgent,
  type EstrategiaLanzamientoResult,
} from "./estrategia-lanzamiento";
import { runVeredictoAgent } from "./veredicto";

export { STEP_ORDER, type StepName } from "./step-runner";

export function nextStep(current: StepName): StepName | null {
  const i = STEP_ORDER.indexOf(current);
  return STEP_ORDER[i + 1] ?? null;
}

interface ValidationRow {
  id: string;
  input_idea: string;
  input_rubro: string | null;
  input_pais: string | null;
  input_mercado: string | null;
}

async function getDoneResult<T>(
  supabase: ReturnType<typeof createAdminClient>,
  validationId: string,
  stepName: StepName,
): Promise<T> {
  const { data, error } = await supabase
    .from("validation_steps")
    .select("result")
    .eq("validation_id", validationId)
    .eq("step_name", stepName)
    .single();

  if (error || !data?.result) {
    throw new Error(
      `No se encontró el resultado de "${stepName}" (¿corrió antes que este paso?).`,
    );
  }
  return data.result as T;
}

/**
 * Corre un paso puntual del pipeline: busca el input original de la
 * validación y los resultados ya persistidos de los pasos previos, arma
 * el input del agente correspondiente y lo ejecuta. Es lo que invoca
 * cada mensaje de QStash — nunca corre más de un paso por invocación.
 */
export async function runPipelineStep(validationId: string, stepName: StepName) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("validations")
    .select("id, input_idea, input_rubro, input_pais, input_mercado")
    .eq("id", validationId)
    .single();

  if (error || !data) {
    throw new Error(`Validación ${validationId} no encontrada.`);
  }
  const validation = data as ValidationRow;

  switch (stepName) {
    case "competencia":
      return runCompetenciaAgent(validationId, {
        idea: validation.input_idea,
        rubro: validation.input_rubro,
        pais: validation.input_pais,
      });

    case "publico_objetivo":
      return runPublicoObjetivoAgent(validationId, {
        idea: validation.input_idea,
        rubro: validation.input_rubro,
        pais: validation.input_pais,
        mercado: validation.input_mercado,
      });

    case "modelo_negocio": {
      const competencia = await getDoneResult<CompetenciaResult>(
        supabase,
        validationId,
        "competencia",
      );
      const publicoObjetivo = await getDoneResult<PublicoObjetivoResult>(
        supabase,
        validationId,
        "publico_objetivo",
      );
      return runModeloNegocioAgent(validationId, {
        idea: validation.input_idea,
        competencia,
        publicoObjetivo,
      });
    }

    case "estrategia_lanzamiento": {
      const competencia = await getDoneResult<CompetenciaResult>(
        supabase,
        validationId,
        "competencia",
      );
      const publicoObjetivo = await getDoneResult<PublicoObjetivoResult>(
        supabase,
        validationId,
        "publico_objetivo",
      );
      const modeloNegocio = await getDoneResult<ModeloNegocioResult>(
        supabase,
        validationId,
        "modelo_negocio",
      );
      return runEstrategiaLanzamientoAgent(validationId, {
        idea: validation.input_idea,
        competencia,
        publicoObjetivo,
        modeloNegocio,
      });
    }

    case "veredicto": {
      const competencia = await getDoneResult<CompetenciaResult>(
        supabase,
        validationId,
        "competencia",
      );
      const publicoObjetivo = await getDoneResult<PublicoObjetivoResult>(
        supabase,
        validationId,
        "publico_objetivo",
      );
      const modeloNegocio = await getDoneResult<ModeloNegocioResult>(
        supabase,
        validationId,
        "modelo_negocio",
      );
      const estrategiaLanzamiento = await getDoneResult<EstrategiaLanzamientoResult>(
        supabase,
        validationId,
        "estrategia_lanzamiento",
      );
      return runVeredictoAgent(validationId, {
        idea: validation.input_idea,
        competencia,
        publicoObjetivo,
        modeloNegocio,
        estrategiaLanzamiento,
      });
    }

    default: {
      const exhaustive: never = stepName;
      throw new Error(`Paso desconocido: ${exhaustive}`);
    }
  }
}
