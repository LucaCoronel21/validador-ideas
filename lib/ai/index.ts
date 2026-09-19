import "server-only";
import type { AIProvider } from "./provider";
import { GeminiProvider } from "./gemini-provider";

export type { AIProvider } from "./provider";

let cached: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (cached) return cached;

  const providerName = process.env.AI_PROVIDER ?? "gemini";

  switch (providerName) {
    case "gemini":
      cached = new GeminiProvider(
        process.env.GEMINI_API_KEY!,
        process.env.GEMINI_MODEL,
      );
      break;
    default:
      throw new Error(`AI_PROVIDER desconocido: "${providerName}"`);
  }

  return cached;
}
