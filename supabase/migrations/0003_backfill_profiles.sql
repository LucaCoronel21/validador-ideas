-- Backfill: crea profiles para usuarios que se registraron ANTES de que
-- existiera el trigger on_auth_user_created (ej. durante la etapa 2).
insert into public.profiles (id, email)
select u.id, u.email
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
