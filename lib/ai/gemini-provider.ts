import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { AIProvider } from "./provider";

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// El tier gratuito de Gemini devuelve 503 ("high demand") con bastante
// frecuencia aunque la key y el request sean válidos — es transitorio y
// suele resolverse en segundos, así que vale la pena reintentar adentro
// de la misma invocación con backoff corto.
function isRetryableTransient(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('"code":503') || message.includes("UNAVAILABLE");
}

// 429 (RESOURCE_EXHAUSTED) es distinto: el free tier tiene un límite muy
// chico de requests/minuto (5 en gemini-3.6-flash), y el error trae un
// retryDelay de decenas de segundos. Reintentar rápido adentro de la
// misma función NO ayuda — cada intento consume otra unidad de una
// cuota que ya está agotada para esta ventana, empeorando la congestión.
// Mejor fallar rápido acá y dejar que QStash reintente el paso completo
// en una invocación aparte más adelante (su backoff entre reintentos es
// de decenas de segundos a minutos, que es lo que realmente hace falta).
function isRateLimited(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('"code":429') || message.includes("RESOURCE_EXHAUSTED");
}

export class GeminiProvider implements AIProvider {
  private client: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model = "gemini-flash-latest") {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async generateStructured<T>({
    systemPrompt,
    prompt,
    schema,
  }: {
    systemPrompt: string;
    prompt: string;
    schema: Record<string, unknown>;
  }): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await this.client.models.generateContent({
          model: this.model,
          contents: prompt,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        });

        const text = response.text;
        if (!text) {
          throw new Error("Gemini no devolvió contenido.");
        }

        return JSON.parse(text) as T;
      } catch (error) {
        lastError = error;
        if (isRateLimited(error)) {
          throw error;
        }
        if (!isRetryableTransient(error) || attempt === MAX_RETRIES - 1) {
          throw error;
        }
        await sleep(BASE_DELAY_MS * 2 ** attempt);
      }
    }

    throw lastError;
  }
}
