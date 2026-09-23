import fs from "node:fs";
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1);
}
const { createClient } = await import("@supabase/supabase-js");
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const validationId = process.argv[2];

for (let i = 0; i < 20; i++) {
  const { data: steps } = await admin
    .from("validation_steps")
    .select("step_name, status, error")
    .eq("validation_id", validationId)
    .order("updated_at");

  const { data: validation } = await admin
    .from("validations")
    .select("status, viability_score")
    .eq("id", validationId)
    .single();

  console.log(
    `[t+${i * 10}s]`,
    steps.map((s) => `${s.step_name}:${s.status}${s.error ? "(" + s.error.slice(0, 50) + ")" : ""}`).join(" | "),
    "| validation:", validation.status, validation.viability_score,
  );

  if (steps.every((s) => s.status === "done") || steps.some((s) => s.status === "failed")) {
    break;
  }
  await new Promise((r) => setTimeout(r, 10000));
}
