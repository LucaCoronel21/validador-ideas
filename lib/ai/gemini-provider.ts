import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { AIProvider } from "./provider";

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// El tier gratuito de Gemini devuelve 503 ("high demand") con bastante
// frecuencia aunque la key y el request sean válidos, y 429 ("resource
// exhausted") cuando dos pasos del pipeline llaman a Gemini muy seguido
// y se pasa el límite de requests por minuto. Ambos son transitorios:
// sin retry, cualquier paso del pipeline puede fallar solo por mala
// suerte de timing.
function isRetryable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('"code":503') ||
    message.includes("UNAVAILABLE") ||
    message.includes('"code":429') ||
    message.includes("RESOURCE_EXHAUSTED")
  );
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
        if (!isRetryable(error) || attempt === MAX_RETRIES - 1) {
          throw error;
        }
        await sleep(BASE_DELAY_MS * 2 ** attempt);
      }
    }

    throw lastError;
  }
}
