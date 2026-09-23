import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enqueueStep } from "@/lib/qstash";
import type { StepName } from "@/lib/agents/pipeline";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // RLS confirma que la validación es del usuario logueado.
  const { data: validation } = await supabase
    .from("validations")
    .select("id")
    .eq("id", id)
    .single();

  if (!validation) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  const { stepName } = (await request.json()) as { stepName: StepName };

  await enqueueStep(id, stepName);

  return NextResponse.json({ ok: true });
}
