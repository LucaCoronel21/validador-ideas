"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    sendMagicLink,
    undefined,
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold">Validador de Ideas</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ingresá tu email y te mandamos un link para entrar, sin contraseña.
        </p>
      </div>

      {state && "sent" in state ? (
        <p className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
          Listo, revisá tu email y hacé click en el link para entrar.
        </p>
      ) : (
        <form action={action} className="flex flex-col gap-3">
          <input
            type="email"
            name="email"
            placeholder="tu@email.com"
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {state && "error" in state && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Enviando..." : "Enviar link"}
          </button>
        </form>
      )}
    </main>
  );
}
