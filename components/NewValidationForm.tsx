"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewValidationForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(e.currentTarget);
    const body = {
      idea: form.get("idea"),
      rubro: form.get("rubro") || undefined,
      pais: form.get("pais") || undefined,
      mercado: form.get("mercado") || undefined,
    };

    try {
      const res = await fetch("/api/validations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Algo salió mal, probá de nuevo.");
        setPending(false);
        return;
      }

      router.push(`/validations/${data.validationId}`);
    } catch {
      setError("No se pudo conectar con el servidor. Probá de nuevo.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
      <h2 className="text-lg font-medium">Nueva validación</h2>

      <textarea
        name="idea"
        required
        rows={4}
        placeholder="Describí tu idea de negocio en un par de líneas..."
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
      />

      <div className="grid grid-cols-3 gap-2">
        <input
          name="rubro"
          placeholder="Rubro (opcional)"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          name="pais"
          placeholder="País (opcional)"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          name="mercado"
          placeholder="Mercado objetivo (opcional)"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Iniciando..." : "Validar idea"}
      </button>
    </form>
  );
}
