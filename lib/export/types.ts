import type {
  CompetenciaResult,
  PublicoObjetivoResult,
  ModeloNegocioResult,
  EstrategiaLanzamientoResult,
  VeredictoResult,
} from "@/lib/agents/types";

export interface ExportValidation {
  input_idea: string;
  input_rubro: string | null;
  input_pais: string | null;
  input_mercado: string | null;
  viability_score: number | null;
  created_at: string;
}

export interface ExportSteps {
  competencia: CompetenciaResult | null;
  publico_objetivo: PublicoObjetivoResult | null;
  modelo_negocio: ModeloNegocioResult | null;
  estrategia_lanzamiento: EstrategiaLanzamientoResult | null;
  veredicto: VeredictoResult | null;
}
