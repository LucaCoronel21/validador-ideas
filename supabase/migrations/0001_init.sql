-- Etapa 3: modelo de datos + Row Level Security
create extension if not exists pgcrypto;

-- ============================================================
-- profiles: 1:1 con auth.users. Guarda el contador de uso diario
-- por usuario para el rate limiting.
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  validations_today int not null default 0,
  validations_reset_at date not null default current_date
);

alter table public.profiles enable row level security;

create policy "profiles: select own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

-- Crea automáticamente la fila de profile cuando alguien se registra
-- (signInWithOtp crea el usuario en auth.users en el primer login).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- validations: una fila por idea validada (historial del usuario)
-- ============================================================
create table public.validations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  input_idea text not null,
  input_rubro text,
  input_pais text,
  input_mercado text,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'done', 'failed')),
  viability_score int,
  created_at timestamptz not null default now()
);

alter table public.validations enable row level security;

create policy "validations: select own" on public.validations
  for select using (auth.uid() = user_id);

create policy "validations: insert own" on public.validations
  for insert with check (auth.uid() = user_id);

-- No hay policy de update/delete para el usuario: el avance de estado
-- (pending -> running -> done) lo hace el job runner con el cliente
-- service_role, que bypassea RLS.

-- ============================================================
-- validation_steps: una fila por agente del pipeline. Es la tabla
-- que el frontend escucha vía Supabase Realtime para el progreso en vivo.
-- ============================================================
create table public.validation_steps (
  id uuid primary key default gen_random_uuid(),
  validation_id uuid not null references public.validations (id) on delete cascade,
  step_name text not null
    check (step_name in ('competencia', 'publico_objetivo', 'modelo_negocio', 'estrategia_lanzamiento', 'veredicto')),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'done', 'failed')),
  result jsonb,
  sources jsonb,
  error text,
  updated_at timestamptz not null default now(),
  unique (validation_id, step_name)
);

alter table public.validation_steps enable row level security;

-- No hay acceso directo a validation_id -> user_id en esta tabla, así que
-- la policy hace un subquery a validations para confirmar dueño.
create policy "validation_steps: select own" on public.validation_steps
  for select using (
    exists (
      select 1 from public.validations v
      where v.id = validation_steps.validation_id
        and v.user_id = auth.uid()
    )
  );

-- Solo el job runner (service_role) inserta/actualiza filas de pasos.

-- Habilita Realtime (postgres_changes) sobre esta tabla para que el
-- frontend reciba updates en vivo sin hacer polling.
alter publication supabase_realtime add table public.validation_steps;

-- ============================================================
-- usage_daily_global: tope global diario, se chequea ANTES de
-- llamar a la IA. Sin policies -> nadie autenticado puede leer/escribir
-- directo, solo el cliente service_role (bypassea RLS).
-- ============================================================
create table public.usage_daily_global (
  day date primary key default current_date,
  validations_count int not null default 0
);

alter table public.usage_daily_global enable row level security;
