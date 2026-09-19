import "server-only";
import { Client } from "@upstash/qstash";
import type { StepName } from "@/lib/agents/pipeline";

let client: Client | null = null;

function getQStashClient() {
  if (!client) {
    client = new Client({ token: process.env.QSTASH_TOKEN! });
  }
  return client;
}

/**
 * Encola un paso del pipeline. Cada mensaje de QStash dispara UNA sola
 * invocación corta de /api/jobs/run-step — así ningún request individual
 * se acerca al límite de duración de las funciones de Vercel, sin
 * importar cuánto tarde el pipeline completo.
 */
export async function enqueueStep(validationId: string, stepName: StepName) {
  await getQStashClient().publishJSON({
    url: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/run-step`,
    body: { validationId, stepName },
  });
}
