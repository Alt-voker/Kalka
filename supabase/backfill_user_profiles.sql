insert into public.user_profiles (
  auth_user_id,
  email,
  first_name,
  last_name,
  phone,
  status
)
select
  u.id,
  lower(coalesce(u.email, '')),
  coalesce(nullif(trim(coalesce(u.raw_user_meta_data ->> 'first_name', u.raw_user_meta_data ->> 'firstName', '')), ''), 'Пользователь'),
  coalesce(nullif(trim(coalesce(u.raw_user_meta_data ->> 'last_name', u.raw_user_meta_data ->> 'lastName', '')), ''), ''),
  coalesce(nullif(trim(coalesce(u.raw_user_meta_data ->> 'phone', '')), ''), ''),
  'active'
from auth.users u
where not exists (
  select 1
  from public.user_profiles up
  where up.auth_user_id = u.id
)
on conflict (auth_user_id) do nothing;
