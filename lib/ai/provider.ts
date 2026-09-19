/**
 * Contrato que cualquier proveedor de IA debe cumplir. Los agentes del
 * pipeline (lib/agents/*) solo conocen esta interfaz, nunca el SDK
 * concreto — cambiar de proveedor es escribir una clase nueva acá y
 * cambiar AI_PROVIDER en el env, sin tocar los agentes.
 */
export interface AIProvider {
  /**
   * Genera una respuesta que cumple el JSON Schema dado. `schema` usa el
   * subconjunto de JSON Schema que soporta la API del proveedor
   * (para Gemini: OpenAPI 3.0 schema object).
   */
  generateStructured<T>(params: {
    systemPrompt: string;
    prompt: string;
    schema: Record<string, unknown>;
  }): Promise<T>;
}
