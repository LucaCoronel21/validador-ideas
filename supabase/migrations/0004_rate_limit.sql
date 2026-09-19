-- Chequea y consume, en una sola transacción atómica, el tope diario
-- global y el tope diario por usuario. Devuelve 'ok' | 'global' | 'user'.
-- Al hacerlo todo en una función de Postgres con FOR UPDATE evitamos que
-- dos requests concurrentes pasen el límite al mismo tiempo (race
-- condition que sí ocurriría haciendo el check y el incremento como dos
-- pasos separados desde el código de la app).
create or replace function public.check_and_consume_rate_limit(
  p_user_id uuid,
  p_global_limit int,
  p_user_limit int
)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  global_count int;
  user_count int;
begin
  insert into public.usage_daily_global (day, validations_count)
  values (current_date, 0)
  on conflict (day) do nothing;

  select validations_count into global_count
  from public.usage_daily_global
  where day = current_date
  for update;

  if global_count >= p_global_limit then
    return 'global';
  end if;

  select
    case when validations_reset_at < current_date then 0 else validations_today end
  into user_count
  from public.profiles
  where id = p_user_id
  for update;

  if user_count is null then
    return 'user';
  end if;

  if user_count >= p_user_limit then
    return 'user';
  end if;

  update public.usage_daily_global
  set validations_count = validations_count + 1
  where day = current_date;

  update public.profiles
  set validations_today = user_count + 1, validations_reset_at = current_date
  where id = p_user_id;

  return 'ok';
end;
$$;

grant execute on function public.check_and_consume_rate_limit(uuid, int, int) to service_role;
