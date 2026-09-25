import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewValidationForm } from "@/components/NewValidationForm";
import { logout } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  running: "En progreso",
  done: "Completa",
  failed: "Con errores",
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: validations } = await supabase
    .from("validations")
    .select("id, input_idea, status, viability_score, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Validador de Ideas</h1>
        <form action={logout}>
          <button type="submit" className="text-sm text-gray-500 underline dark:text-gray-400">
            Cerrar sesión ({user.email})
          </button>
        </form>
      </div>

      <NewValidationForm />

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Historial</h2>
        {!validations?.length && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Todavía no validaste ninguna idea.</p>
        )}
        {validations?.map((v) => (
          <Link
            key={v.id}
            href={`/validations/${v.id}`}
            className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            <span className="truncate">{v.input_idea}</span>
            <span className="ml-2 shrink-0 text-gray-500 dark:text-gray-400">
              {v.status === "done" && v.viability_score != null
                ? `${v.viability_score}/10`
                : STATUS_LABEL[v.status] ?? v.status}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
