import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ValidationDetail } from "@/components/ValidationDetail";

export default async function ValidationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // RLS ya filtra por auth.uid() = user_id, así que si esto no devuelve
  // nada es porque no existe o no es del usuario logueado — 404 en ambos
  // casos, no filtramos información sobre validaciones ajenas.
  const { data: validation } = await supabase
    .from("validations")
    .select("id, input_idea, input_rubro, input_pais, input_mercado, status, viability_score, created_at")
    .eq("id", id)
    .single();

  if (!validation) {
    notFound();
  }

  const { data: steps } = await supabase
    .from("validation_steps")
    .select("step_name, status, result, sources, error, updated_at")
    .eq("validation_id", id);

  return <ValidationDetail validation={validation} initialSteps={steps ?? []} />;
}
