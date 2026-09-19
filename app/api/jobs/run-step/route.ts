import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { runPipelineStep, nextStep, type StepName } from "@/lib/agents/pipeline";
import { enqueueStep } from "@/lib/qstash";

async function handler(request: Request) {
  const { validationId, stepName } = (await request.json()) as {
    validationId: string;
    stepName: StepName;
  };

  // No hacemos try/catch acá: si el agente tira, dejamos que la respuesta
  // sea un error para que QStash reintente este mismo paso solo (con su
  // policy de reintentos), en vez de que nosotros reinventemos eso.
  await runPipelineStep(validationId, stepName);

  const next = nextStep(stepName);
  if (next) {
    await enqueueStep(validationId, next);
  }

  return NextResponse.json({ ok: true, step: stepName, next });
}

export const POST = verifySignatureAppRouter(handler);
