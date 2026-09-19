import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const GLOBAL_DAILY_LIMIT = Number(process.env.GLOBAL_DAILY_LIMIT ?? 20);
const USER_DAILY_LIMIT = Number(process.env.USER_DAILY_LIMIT ?? 3);

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "global" | "user" };

/**
 * Chequea y consume (atómicamente, ver migración 0004) el tope diario
 * antes de encolar cualquier trabajo que llame a la IA. Se llama ANTES de
 * insertar la validación, para no gastar ni una llamada si ya se alcanzó
 * el límite.
 */
export async function checkAndConsumeRateLimit(
  userId: string,
): Promise<RateLimitResult> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("check_and_consume_rate_limit", {
    p_user_id: userId,
    p_global_limit: GLOBAL_DAILY_LIMIT,
    p_user_limit: USER_DAILY_LIMIT,
  });

  if (error) throw error;

  if (data === "global") return { allowed: false, reason: "global" };
  if (data === "user") return { allowed: false, reason: "user" };
  return { allowed: true };
}

export const RATE_LIMIT_MESSAGES = {
  global:
    "Llegamos al límite de validaciones gratuitas de hoy para toda la app. Probá de nuevo mañana.",
  user: `Ya usaste tus ${USER_DAILY_LIMIT} validaciones gratuitas de hoy. Probá de nuevo mañana.`,
};
