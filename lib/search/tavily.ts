import "server-only";

export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

/**
 * Búsqueda web real de competidores. Separado detrás de esta función (no
 * un objeto/clase) porque por ahora es el único uso de búsqueda del
 * proyecto — si el día de mañana se agrega otro proveedor, se sube a una
 * interfaz como lib/ai/provider.ts.
 */
export async function searchWeb(
  query: string,
  maxResults = 8,
): Promise<SearchResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: "advanced",
      max_results: maxResults,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tavily search falló (${res.status}): ${body}`);
  }

  const data = await res.json();

  return (data.results ?? []).map((r: { title: string; url: string; content: string }) => ({
    title: r.title,
    url: r.url,
    content: r.content,
  }));
}
