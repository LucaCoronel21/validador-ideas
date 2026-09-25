# Validador de Ideas de Negocio

Describís una idea de negocio en texto libre y la app genera un informe de validación con 5 secciones: análisis de competencia (con competidores **reales**, encontrados por búsqueda web y citados con fuente), público objetivo, modelo de negocio, estrategia de lanzamiento y un veredicto final con puntaje de viabilidad.

**Demo:** [validador-ideas-lovat.vercel.app](https://validador-ideas-lovat.vercel.app)

Segundo proyecto de portfolio, pensado para sumar lo que el anterior ([resumidor-pdfs](https://github.com/LucaCoronel21/resumidor-pdfs)) no tenía: base de datos real, autenticación, orquestación de varios agentes de IA y datos externos reales en vez de solo generación de texto.

## Arquitectura

```
Usuario ──▶ Next.js (App Router, Vercel)
              │
              ├─ Server Components / Server Actions ──▶ Supabase (Postgres + Auth + Realtime)
              │                                              │
              │                                              ▼
              │                                   validations + validation_steps
              │
              └─ POST /api/validations
                   1. chequea rate limit (RPC atómico en Postgres)
                   2. crea la validación + 5 filas "pending"
                   3. encola el primer paso
                        │
                        ▼
                   Upstash QStash ──▶ POST /api/jobs/run-step
                   (cola HTTP, reintentos      (una invocación corta por paso:
                    automáticos, espera         Tavily si hace falta + Gemini +
                    15s entre pasos)            guarda el resultado)
                        │                            │
                        │◀───────── encola el siguiente paso ─┘
                        │
                        ▼
              Supabase Realtime empuja cada cambio de estado
              al browser → la UI actualiza cada tarjeta sola,
              sin polling y sin refrescar la página
```

**La pieza central del diseño**: generar las 5 secciones tarda varios minutos, más de lo que aguanta una función serverless de Vercel corriendo de punta a punta. En vez de eso, cada paso del pipeline es **una invocación corta e independiente**, encadenada por QStash — nunca hay una sola función corriendo más de unos segundos, sin importar cuánto tarde el pipeline completo. Si un paso falla, QStash lo reintenta solo; si se agotan los reintentos, el usuario puede reintentar ese paso puntual desde la UI sin perder los que ya terminaron.

## Stack y por qué

| Pieza | Elegido | Por qué |
|---|---|---|
| Framework | Next.js 16 (App Router) | Ya lo conocía del proyecto anterior; Server Components + Server Actions simplifican la capa de datos |
| Auth + DB | Supabase | Postgres real con Row Level Security, Auth y Realtime integrados sin infraestructura propia |
| IA | Google Gemini | Free tier suficiente para un proyecto de portfolio, detrás de una capa de abstracción propia (`lib/ai/`) — cambiar de proveedor es escribir una clase nueva y cambiar `AI_PROVIDER` |
| Búsqueda web | Tavily | Pensado específicamente para RAG/agentes (resultados con URL+snippet listos para citar), separa "buscar hechos reales" de "razonar con esos hechos" (Gemini). Alternativa evaluada: grounding nativo de Gemini — descartado por pricing menos predecible en volumen |
| Orquestación | Upstash QStash | Resuelve el problema de los timeouts de Vercel: cola HTTP con reintentos automáticos, sin tener que armar un sistema de colas propio |
| Deploy | Vercel | Integración directa con Next.js, deploy automático por push a `main` |

## Modelo de datos

- **`profiles`** — extiende `auth.users`, guarda el contador de uso diario por usuario.
- **`validations`** — una fila por idea validada (el historial del usuario).
- **`validation_steps`** — una fila por agente del pipeline (`competencia`, `publico_objetivo`, `modelo_negocio`, `estrategia_lanzamiento`, `veredicto`), con su estado (`pending/running/done/failed`), resultado en JSON, y `user_id` propio (ver limitaciones — necesario para que Realtime funcione).
- **`usage_daily_global`** — contador global del día, para el tope diario.

Row Level Security en todo: cada usuario solo puede leer sus propias filas. Las escrituras de `validation_steps` y `usage_daily_global` las hace únicamente el backend con el cliente `service_role` (bypassea RLS) — los usuarios nunca tienen permiso de insert/update ahí directamente.

## Protección de uso

La app es pública, así que antes de llamar a la IA se chequea (atómicamente, con una función de Postgres para evitar race conditions) un tope diario **global** (toda la app) y uno **por usuario**. Si se supera cualquiera, se corta antes de gastar ni una llamada a Gemini, con un mensaje claro en el formulario.

## Limitaciones conocidas

- **El free tier de Gemini permite apenas 20 requests/día por modelo** (no está documentado con ese número exacto en la doc pública — se confirmó en el body de un error 429 real). Como cada validación completa gasta 5 llamadas (una por agente), el techo real es de **~4 validaciones por día en toda la app**. `GLOBAL_DAILY_LIMIT` está configurado en base a esto, no a un número arbitrario. Pasar a facturación de Gemini (pay-as-you-go) eliminaría el techo con un costo mínimo, pero no se hizo para mantener el proyecto 100% gratuito.
- **El envío de emails de login usa el mailer default de Supabase**, que tiene su propio límite bajo (pensado solo para testing puntual, no producción). Se evaluó SMTP propio con Resend, pero su relay SMTP exige un dominio verificado incluso para el remitente de pruebas — a diferencia de su API HTTP. Migrar a SMTP propio queda pendiente de tener un dominio para el proyecto.
- **Reintentar manualmente un paso mientras un reintento automático de QStash sigue en vuelo puede generar una carrera** donde el resultado que "gana" no es necesariamente el más reciente exitoso (last-write-wins sin versión). Es un caso borde poco probable en uso normal (un usuario no suele reintentar el mismo paso dos veces en simultáneo), documentado acá en vez de resuelto con locking optimista por alcance.
- **Sin tests automatizados** — alcance del proyecto priorizó cubrir la arquitectura end-to-end (auth, DB+RLS, pipeline multi-agente, background jobs, Realtime) antes que suite de tests, dado el tiempo disponible.
- **Un solo proveedor de IA implementado** (Gemini) — la interfaz `AIProvider` está lista para agregar otros, pero no se probó ninguno más.

## Cómo correrlo

```bash
npm install
cp .env.example .env.local   # completar con las claves propias
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

Necesita cuenta en Supabase, Google AI Studio (Gemini), Tavily y Upstash (QStash). Las migraciones SQL están en `supabase/migrations/`, se corren en orden desde el SQL Editor de Supabase.

## Estructura

```
app/
  login/                      -- login con magic link
  auth/callback/               -- intercambia el code de Supabase por sesión
  validations/[id]/            -- vista de detalle con progreso en vivo
  api/
    validations/                -- crea una validación, chequea rate limit
    validations/[id]/retry/      -- reintenta un paso puntual
    validations/[id]/export/     -- exporta a Markdown o PDF
    jobs/run-step/               -- lo invoca QStash, corre un paso del pipeline
lib/
  ai/                         -- capa de abstracción de IA (interfaz + GeminiProvider)
  search/                     -- cliente de Tavily
  agents/                     -- los 5 agentes + orquestador del pipeline
  supabase/                   -- clientes de Supabase (browser/server/admin)
  export/                     -- generación de Markdown
  qstash.ts                   -- encolar pasos del pipeline
  rate-limit.ts                -- chequeo de límites diarios
components/
  ValidationDetail.tsx        -- vista de detalle + suscripción a Realtime
  NewValidationForm.tsx       -- formulario de nueva validación
  pdf/                        -- documento PDF con @react-pdf/renderer
supabase/migrations/          -- schema, RLS, funciones de Postgres
proxy.ts                      -- protege la app por sesión (Next.js 16 renombró middleware a proxy)
```
