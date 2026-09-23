// Ruta temporal SOLO para la verificación final de la etapa 6. Se borra
// apenas termine la prueba.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STEP_ORDER } from "@/lib/agents/pipeline";
import { enqueueStep } from "@/lib/qstash";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.has("debug")) {
    return NextResponse.json({
      GEMINI_MODEL: process.env.GEMINI_MODEL ?? null,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? null,
    });
  }

  try {
    const admin = createAdminClient();

    const { data: users, error: usersError } = await admin.auth.admin.listUsers();
    if (usersError) throw usersError;
    const userId = users.users[0]?.id;
    if (!userId) {
      return NextResponse.json({ error: "No hay usuarios registrados" }, { status: 400 });
    }

    const { data: validation, error: insertError } = await admin
      .from("validations")
      .insert({
        user_id: userId,
        input_idea: "Suscripción mensual de cajas de snacks saludables para oficinas",
        input_rubro: "alimentos",
        input_pais: "Argentina",
        status: "running",
      })
      .select()
      .single();

    if (insertError || !validation) {
      return NextResponse.json({ error: insertError?.message }, { status: 500 });
    }

    const { error: stepsError } = await admin.from("validation_steps").insert(
      STEP_ORDER.map((step_name) => ({
        validation_id: validation.id,
        step_name,
        status: "pending",
      })),
    );
    if (stepsError) throw stepsError;

    await enqueueStep(validation.id, STEP_ORDER[0]);

    return NextResponse.json({ validation_id: validation.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
