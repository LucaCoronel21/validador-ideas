-- Fix: las tablas nuevas no heredaron los GRANT por defecto de Supabase
-- para los roles anon/authenticated/service_role. RLS filtra filas, pero
-- sin GRANT a nivel de tabla ningún rol puede acceder, ni siquiera
-- service_role (que bypassea RLS pero igual necesita el GRANT).

grant usage on schema public to anon, authenticated, service_role;

-- service_role: acceso total (es el rol del job runner, bypassea RLS igual)
grant all on public.profiles, public.validations, public.validation_steps, public.usage_daily_global
  to service_role;

-- authenticated: acceso acotado, las policies de RLS filtran las filas
grant select, update on public.profiles to authenticated;
grant select, insert on public.validations to authenticated;
grant select on public.validation_steps to authenticated;
-- usage_daily_global: sin grant para authenticated a propósito, solo
-- service_role puede tocarla.

-- Para que futuras tablas creadas por el rol que corre las migraciones
-- (postgres) hereden los grants automáticamente, sin tener que repetir esto.
alter default privileges for role postgres in schema public
  grant all on tables to service_role;
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to authenticated;
