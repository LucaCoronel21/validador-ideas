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
 *
 * `delaySeconds` espacia el paso siguiente: el free tier de Gemini
 * permite 5 requests/minuto, así que 5 agentes disparando sin pausa
 * entre sí pueden pisarse su propia cuota. 15s de espaciado deja margen
 * cómodo (mínimo necesario: 12s) sin agregar demasiado al tiempo total.
 */
export async function enqueueStep(
  validationId: string,
  stepName: StepName,
  delaySeconds = 0,
) {
  await getQStashClient().publishJSON({
    url: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/run-step`,
    body: { validationId, stepName },
    ...(delaySeconds > 0 ? { delay: delaySeconds } : {}),
  });
}
