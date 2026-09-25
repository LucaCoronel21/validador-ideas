import type { ExportValidation, ExportSteps } from "./types";

export function buildMarkdown(validation: ExportValidation, steps: ExportSteps): string {
  const parts: string[] = [];

  parts.push(`# Validación de idea: ${validation.input_idea}`);
  parts.push("");

  const meta = [
    validation.input_rubro && `**Rubro:** ${validation.input_rubro}`,
    validation.input_pais && `**País:** ${validation.input_pais}`,
    validation.input_mercado && `**Mercado objetivo:** ${validation.input_mercado}`,
    `**Fecha:** ${new Date(validation.created_at).toLocaleDateString("es-AR")}`,
  ].filter(Boolean);
  parts.push(meta.join(" · "));
  parts.push("");

  if (validation.viability_score != null) {
    parts.push(`## Puntaje de viabilidad: ${validation.viability_score}/10`);
    parts.push("");
  }

  if (steps.competencia) {
    parts.push("## Análisis de competencia");
    parts.push(steps.competencia.resumen);
    parts.push("");
    for (const c of steps.competencia.competidores) {
      parts.push(`- **[${c.nombre}](${c.url})** — ${c.descripcion} _(${c.diferenciador})_`);
    }
    parts.push("");
  }

  if (steps.publico_objetivo) {
    parts.push("## Público objetivo");
    for (const s of steps.publico_objetivo.segmentos) {
      parts.push(`### ${s.nombre}`);
      parts.push(s.descripcion);
      parts.push(`- **Dolores:** ${s.dolores.join(", ")}`);
      parts.push(`- **Dónde encontrarlos:** ${s.donde_encontrarlos.join(", ")}`);
      parts.push("");
    }
  }

  if (steps.modelo_negocio) {
    parts.push("## Modelo de negocio");
    parts.push(`- **Fuentes de ingreso:** ${steps.modelo_negocio.fuentes_ingreso.join(", ")}`);
    parts.push(`- **Estructura de costos:** ${steps.modelo_negocio.estructura_costos.join(", ")}`);
    parts.push(`- **Hipótesis de precio:** ${steps.modelo_negocio.hipotesis_precio}`);
    parts.push("");
  }

  if (steps.estrategia_lanzamiento) {
    parts.push("## Estrategia de lanzamiento");
    parts.push(`- **MVP mínimo:** ${steps.estrategia_lanzamiento.mvp_minimo}`);
    parts.push(`- **Primer canal:** ${steps.estrategia_lanzamiento.primer_canal}`);
    parts.push(`- **Primeros 100 usuarios:** ${steps.estrategia_lanzamiento.primeros_100_usuarios}`);
    parts.push("");
  }

  if (steps.veredicto) {
    parts.push("## Veredicto final");
    parts.push(steps.veredicto.justificacion);
    parts.push("");
    parts.push("**Principales riesgos:**");
    for (const r of steps.veredicto.principales_riesgos) {
      parts.push(`- ${r}`);
    }
    parts.push("");
  }

  parts.push("---");
  parts.push("_Generado por Validador de Ideas._");

  return parts.join("\n");
}
