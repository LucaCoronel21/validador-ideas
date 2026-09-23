import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAndConsumeRateLimit, RATE_LIMIT_MESSAGES } from "@/lib/rate-limit";
import { STEP_ORDER } from "@/lib/agents/pipeline";
import { enqueueStep } from "@/lib/qstash";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const idea = String(body.idea ?? "").trim();
  if (!idea) {
    return NextResponse.json({ error: "La idea no puede estar vacía." }, { status: 400 });
  }
  const rubro = body.rubro ? String(body.rubro).trim() : null;
  const pais = body.pais ? String(body.pais).trim() : null;
  const mercado = body.mercado ? String(body.mercado).trim() : null;

  // Se chequea ANTES de tocar la base o la IA: si se alcanzó el límite,
  // no se gasta ni una llamada.
  const rateLimit = await checkAndConsumeRateLimit(user.id);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: RATE_LIMIT_MESSAGES[rateLimit.reason] },
      { status: 429 },
    );
  }

  const { data: validation, error: insertError } = await supabase
    .from("validations")
    .insert({
      user_id: user.id,
      input_idea: idea,
      input_rubro: rubro,
      input_pais: pais,
      input_mercado: mercado,
      status: "running",
    })
    .select()
    .single();

  if (insertError || !validation) {
    return NextResponse.json(
      { error: "No se pudo crear la validación." },
      { status: 500 },
    );
  }

  // Las filas de validation_steps las crea el admin client: los usuarios
  // no tienen permiso de insert ahí (ver migración 0001), solo lectura.
  const admin = createAdminClient();
  await admin.from("validation_steps").insert(
    STEP_ORDER.map((step_name) => ({
      validation_id: validation.id,
      user_id: user.id,
      step_name,
      status: "pending",
    })),
  );

  await enqueueStep(validation.id, STEP_ORDER[0]);

  return NextResponse.json({ validationId: validation.id }, { status: 201 });
}
