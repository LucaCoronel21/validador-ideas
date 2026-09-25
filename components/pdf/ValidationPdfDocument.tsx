import { Document, Page, Text, View, StyleSheet, Link } from "@react-pdf/renderer";
import type { ExportValidation, ExportSteps } from "@/lib/export/types";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
  title: { fontSize: 18, marginBottom: 8, fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 9, color: "#555", marginBottom: 16 },
  score: { fontSize: 14, marginBottom: 12, fontFamily: "Helvetica-Bold" },
  h2: { fontSize: 13, marginTop: 16, marginBottom: 6, fontFamily: "Helvetica-Bold" },
  h3: { fontSize: 11, marginTop: 8, marginBottom: 2, fontFamily: "Helvetica-Bold" },
  p: { marginBottom: 4, lineHeight: 1.4 },
  li: { marginBottom: 3, lineHeight: 1.4 },
  link: { color: "#2563eb" },
});

export function ValidationPdfDocument({
  validation,
  steps,
}: {
  validation: ExportValidation;
  steps: ExportSteps;
}) {
  const meta = [
    validation.input_rubro,
    validation.input_pais,
    validation.input_mercado,
    new Date(validation.created_at).toLocaleDateString("es-AR"),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{validation.input_idea}</Text>
        <Text style={styles.meta}>{meta}</Text>

        {validation.viability_score != null && (
          <Text style={styles.score}>Puntaje de viabilidad: {validation.viability_score}/10</Text>
        )}

        {steps.competencia && (
          <View>
            <Text style={styles.h2}>Análisis de competencia</Text>
            <Text style={styles.p}>{steps.competencia.resumen}</Text>
            {steps.competencia.competidores.map((c) => (
              <Text key={c.url} style={styles.li}>
                • <Text style={{ fontFamily: "Helvetica-Bold" }}>{c.nombre}</Text> —{" "}
                {c.descripcion} ({c.diferenciador}) —{" "}
                <Link src={c.url} style={styles.link}>
                  {c.url}
                </Link>
              </Text>
            ))}
          </View>
        )}

        {steps.publico_objetivo && (
          <View>
            <Text style={styles.h2}>Público objetivo</Text>
            {steps.publico_objetivo.segmentos.map((s) => (
              <View key={s.nombre}>
                <Text style={styles.h3}>{s.nombre}</Text>
                <Text style={styles.p}>{s.descripcion}</Text>
                <Text style={styles.li}>Dolores: {s.dolores.join(", ")}</Text>
                <Text style={styles.li}>Dónde encontrarlos: {s.donde_encontrarlos.join(", ")}</Text>
              </View>
            ))}
          </View>
        )}

        {steps.modelo_negocio && (
          <View>
            <Text style={styles.h2}>Modelo de negocio</Text>
            <Text style={styles.li}>Fuentes de ingreso: {steps.modelo_negocio.fuentes_ingreso.join(", ")}</Text>
            <Text style={styles.li}>Estructura de costos: {steps.modelo_negocio.estructura_costos.join(", ")}</Text>
            <Text style={styles.li}>Hipótesis de precio: {steps.modelo_negocio.hipotesis_precio}</Text>
          </View>
        )}

        {steps.estrategia_lanzamiento && (
          <View>
            <Text style={styles.h2}>Estrategia de lanzamiento</Text>
            <Text style={styles.li}>MVP mínimo: {steps.estrategia_lanzamiento.mvp_minimo}</Text>
            <Text style={styles.li}>Primer canal: {steps.estrategia_lanzamiento.primer_canal}</Text>
            <Text style={styles.li}>
              Primeros 100 usuarios: {steps.estrategia_lanzamiento.primeros_100_usuarios}
            </Text>
          </View>
        )}

        {steps.veredicto && (
          <View>
            <Text style={styles.h2}>Veredicto final</Text>
            <Text style={styles.p}>{steps.veredicto.justificacion}</Text>
            <Text style={styles.h3}>Principales riesgos</Text>
            {steps.veredicto.principales_riesgos.map((r) => (
              <Text key={r} style={styles.li}>
                • {r}
              </Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
