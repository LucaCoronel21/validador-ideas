# Validador de Ideas de Negocio

Genera un informe de validación de una idea de negocio (competencia, público objetivo, modelo de negocio, estrategia de lanzamiento y veredicto final) usando búsqueda web real y un pipeline de agentes de IA.

> Proyecto en construcción — este README se irá completando etapa por etapa. La versión final incluirá arquitectura, decisiones técnicas y limitaciones conocidas.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router) + TypeScript + Tailwind CSS
- [Supabase](https://supabase.com) — autenticación (magic link) y base de datos (Postgres + Realtime)
- [Google Gemini](https://ai.google.dev/) como proveedor de IA, detrás de una capa de abstracción propia
- [Tavily](https://tavily.com) para búsqueda web real de competidores
- [Upstash QStash](https://upstash.com/docs/qstash) para orquestar el pipeline de agentes en background
- Deploy en [Vercel](https://vercel.com)

## Requisitos

- Node.js 20+
- Cuenta en Supabase, Google AI Studio (Gemini), Tavily y Upstash

## Getting Started

```bash
npm install
cp .env.example .env.local   # completar con las claves propias
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Estado del proyecto

- [x] Etapa 1 — Scaffolding
- [x] Etapa 2 — Auth con Supabase
- [x] Etapa 3 — Modelo de datos + RLS
- [x] Etapa 4 — Capa de IA + capa de búsqueda
- [x] Etapa 5 — Primer agente end-to-end
- [x] Etapa 6 — Pipeline completo + QStash
- [x] Etapa 7 — UI de progreso en vivo
- [x] Etapa 8 — Exportar + re-ejecutar
- [ ] Etapa 9 — Pulido + README final
