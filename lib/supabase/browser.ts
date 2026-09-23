import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | undefined;

/**
 * Singleton a propósito (a diferencia del cliente de server, que sí debe
 * crearse por-request para leer cookies). Crear un cliente nuevo cada vez
 * puede hacer que un canal de Realtime se suscriba antes de que termine
 * de hidratarse la sesión, quedando sin auth.uid() y con RLS bloqueando
 * todo en silencio.
 */
export function createClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return client;
}
