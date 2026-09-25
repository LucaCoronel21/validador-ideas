import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { buildMarkdown } from "@/lib/export/markdown";
import { ValidationPdfDocument } from "@/components/pdf/ValidationPdfDocument";
import type { ExportSteps } from "@/lib/export/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "md";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // RLS confirma ownership: si no es del usuario, esto no devuelve nada.
  const { data: validation } = await supabase
    .from("validations")
    .select("input_idea, input_rubro, input_pais, input_mercado, viability_score, created_at")
    .eq("id", id)
    .single();

  if (!validation) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  const { data: stepRows } = await supabase
    .from("validation_steps")
    .select("step_name, status, result")
    .eq("validation_id", id);

  const steps: ExportSteps = {
    competencia: null,
    publico_objetivo: null,
    modelo_negocio: null,
    estrategia_lanzamiento: null,
    veredicto: null,
  };
  for (const row of stepRows ?? []) {
    if (row.status === "done") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (steps as any)[row.step_name] = row.result;
    }
  }

  const fileBase = validation.input_idea
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40);

  if (format === "pdf") {
    const buffer = await renderToBuffer(
      ValidationPdfDocument({ validation, steps }) as Parameters<typeof renderToBuffer>[0],
    );
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileBase}.pdf"`,
      },
    });
  }

  const markdown = buildMarkdown(validation, steps);
  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileBase}.md"`,
    },
  });
}
