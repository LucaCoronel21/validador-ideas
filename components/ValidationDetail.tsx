"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/browser";
import type {
  CompetenciaResult,
  PublicoObjetivoResult,
  ModeloNegocioResult,
  EstrategiaLanzamientoResult,
  VeredictoResult,
} from "@/lib/agents/types";

type StepName =
  | "competencia"
  | "publico_objetivo"
  | "modelo_negocio"
  | "estrategia_lanzamiento"
  | "veredicto";

type StepStatus = "pending" | "running" | "done" | "failed";

interface StepRow {
  step_name: StepName;
  status: StepStatus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any;
  sources: { title: string; url: string }[] | null;
  error: string | null;
  updated_at: string;
}

interface Validation {
  id: string;
  input_idea: string;
  input_rubro: string | null;
  input_pais: string | null;
  input_mercado: string | null;
  status: string;
  viability_score: number | null;
  created_at: string;
}

const STEP_LABELS: Record<StepName, string> = {
  competencia: "Análisis de competencia",
  publico_objetivo: "Público objetivo",
  modelo_negocio: "Modelo de negocio",
  estrategia_lanzamiento: "Estrategia de lanzamiento",
  veredicto: "Veredicto final",
};

const STEP_ORDER: StepName[] = [
  "competencia",
  "publico_objetivo",
  "modelo_negocio",
  "estrategia_lanzamiento",
  "veredicto",
];

export function ValidationDetail({
  validation,
  initialSteps,
}: {
  validation: Validation;
  initialSteps: StepRow[];
}) {
  const router = useRouter();
  const [steps, setSteps] = useState<Map<StepName, StepRow>>(
    () => new Map(initialSteps.map((s) => [s.step_name, s])),
  );
  const [rerunning, setRerunning] = useState(false);

  async function handleRerun() {
    setRerunning(true);
    try {
      const res = await fetch("/api/validations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: validation.input_idea,
          rubro: validation.input_rubro ?? undefined,
          pais: validation.input_pais ?? undefined,
          mercado: validation.input_mercado ?? undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/validations/${data.validationId}`);
      } else {
        setRerunning(false);
        alert(data.error ?? "No se pudo re-ejecutar.");
      }
    } catch {
      setRerunning(false);
      alert("No se pudo conectar con el servidor.");
    }
  }

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | undefined;
    let cancelled = false;

    // Hay que esperar a que la sesión esté hidratada antes de suscribirse:
    // si el canal se abre antes de que el cliente tenga el JWT, se
    // conecta como anónimo y RLS bloquea todos los eventos en silencio.
    supabase.auth.getSession().then(() => {
      if (cancelled) return;

      channel = supabase
        .channel(`validation-steps-${validation.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "validation_steps",
            filter: `validation_id=eq.${validation.id}`,
          },
          (payload: RealtimePostgresChangesPayload<StepRow>) => {
            const row = payload.new as StepRow;
            if (!row?.step_name) return;
            setSteps((prev) => new Map(prev).set(row.step_name, row));
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [validation.id]);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-12">
      <div>
        <Link href="/" className="text-sm text-gray-500 underline">
          ← Volver
        </Link>
        <h1 className="mt-2 text-xl font-semibold">{validation.input_idea}</h1>
        <p className="text-sm text-gray-500">
          {[validation.input_rubro, validation.input_pais, validation.input_mercado]
            .filter(Boolean)
            .join(" · ") || "Sin datos adicionales"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={`/api/validations/${validation.id}/export?format=md`}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Exportar Markdown
        </a>
        <a
          href={`/api/validations/${validation.id}/export?format=pdf`}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Exportar PDF
        </a>
        <button
          onClick={handleRerun}
          disabled={rerunning}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {rerunning ? "Re-ejecutando..." : "Re-ejecutar"}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {STEP_ORDER.map((stepName) => (
          <StepCard
            key={stepName}
            validationId={validation.id}
            step={steps.get(stepName) ?? { step_name: stepName, status: "pending", result: null, sources: null, error: null, updated_at: "" }}
          />
        ))}
      </div>
    </main>
  );
}

function StepCard({ validationId, step }: { validationId: string; step: StepRow }) {
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    setRetrying(true);
    await fetch(`/api/validations/${validationId}/retry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stepName: step.step_name }),
    });
    setRetrying(false);
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{STEP_LABELS[step.step_name]}</h3>
        <StatusBadge status={step.status} />
      </div>

      {step.status === "running" && (
        <p className="mt-2 text-sm text-gray-500">Generando...</p>
      )}

      {step.status === "failed" && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-sm text-red-600">No se pudo completar este paso.</p>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="shrink-0 rounded-md border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
          >
            {retrying ? "Reintentando..." : "Reintentar"}
          </button>
        </div>
      )}

      {step.status === "done" && step.result && (
        <div className="mt-3 text-sm">
          <StepResult step={step} />
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: StepStatus }) {
  const styles: Record<StepStatus, string> = {
    pending: "bg-gray-100 text-gray-500",
    running: "bg-blue-100 text-blue-700",
    done: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };
  const labels: Record<StepStatus, string> = {
    pending: "Pendiente",
    running: "En progreso",
    done: "Listo",
    failed: "Error",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function StepResult({ step }: { step: StepRow }) {
  switch (step.step_name) {
    case "competencia": {
      const r = step.result as CompetenciaResult;
      return (
        <div className="flex flex-col gap-2">
          <p>{r.resumen}</p>
          <ul className="flex flex-col gap-1">
            {r.competidores.map((c) => (
              <li key={c.url} className="rounded-md bg-gray-50 p-2">
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                  {c.nombre}
                </a>
                <p className="text-gray-600">{c.descripcion}</p>
                <p className="text-gray-500 italic">{c.diferenciador}</p>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    case "publico_objetivo": {
      const r = step.result as PublicoObjetivoResult;
      return (
        <ul className="flex flex-col gap-2">
          {r.segmentos.map((s) => (
            <li key={s.nombre}>
              <p className="font-medium">{s.nombre}</p>
              <p className="text-gray-600">{s.descripcion}</p>
              <p className="text-gray-500">Dolores: {s.dolores.join(", ")}</p>
              <p className="text-gray-500">Dónde encontrarlos: {s.donde_encontrarlos.join(", ")}</p>
            </li>
          ))}
        </ul>
      );
    }

    case "modelo_negocio": {
      const r = step.result as ModeloNegocioResult;
      return (
        <div className="flex flex-col gap-1">
          <p><span className="font-medium">Fuentes de ingreso:</span> {r.fuentes_ingreso.join(", ")}</p>
          <p><span className="font-medium">Estructura de costos:</span> {r.estructura_costos.join(", ")}</p>
          <p><span className="font-medium">Precio:</span> {r.hipotesis_precio}</p>
        </div>
      );
    }

    case "estrategia_lanzamiento": {
      const r = step.result as EstrategiaLanzamientoResult;
      return (
        <div className="flex flex-col gap-1">
          <p><span className="font-medium">MVP mínimo:</span> {r.mvp_minimo}</p>
          <p><span className="font-medium">Primer canal:</span> {r.primer_canal}</p>
          <p><span className="font-medium">Primeros 100 usuarios:</span> {r.primeros_100_usuarios}</p>
        </div>
      );
    }

    case "veredicto": {
      const r = step.result as VeredictoResult;
      return (
        <div className="flex flex-col gap-1">
          <p className="text-2xl font-semibold">{r.puntaje_viabilidad}/10</p>
          <p className="text-gray-600">{r.justificacion}</p>
          <p className="text-gray-500">Riesgos: {r.principales_riesgos.join(", ")}</p>
        </div>
      );
    }

    default:
      return null;
  }
}
