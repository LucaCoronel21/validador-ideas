import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { AIProvider } from "./provider";

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
  }
}
