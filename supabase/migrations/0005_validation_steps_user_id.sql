-- Fix: Supabase Realtime no evalúa bien policies de RLS que dependen de
-- un subquery a otra tabla (nuestra policy original hacía
-- "exists (select ... from validations where validations.user_id = auth.uid())").
-- Con service_role (sin RLS) los eventos llegaban completos; con
-- authenticated, Realtime los bloqueaba en silencio. La solución estándar
-- es desnormalizar: guardar user_id directo en validation_steps para que
-- la policy sea self-contained, sin mirar otra tabla.

alter table public.validation_steps
  add column user_id uuid references auth.users (id) on delete cascade;

update public.validation_steps vs
set user_id = v.user_id
from public.validations v
where v.id = vs.validation_id;

alter table public.validation_steps
  alter column user_id set not null;

drop policy "validation_steps: select own" on public.validation_steps;

create policy "validation_steps: select own" on public.validation_steps
  for select using (auth.uid() = user_id);
