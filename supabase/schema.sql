create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  first_name text not null default '',
  last_name text not null default '',
  company text not null default 'КальКа',
  role text not null default 'manager',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_state (
  scope text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    first_name,
    last_name,
    company,
    role,
    status
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'first', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', new.raw_user_meta_data ->> 'last', ''),
    coalesce(new.raw_user_meta_data ->> 'company', 'КальКа'),
    coalesce(new.raw_user_meta_data ->> 'role', new.raw_user_meta_data ->> 'app_role', 'manager'),
    coalesce(new.raw_user_meta_data ->> 'status', 'active')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    company = excluded.company,
    role = excluded.role,
    status = excluded.status,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.app_state enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "app_state_read_authenticated" on public.app_state;
create policy "app_state_read_authenticated"
on public.app_state
for select
to authenticated
using (true);

drop policy if exists "app_state_write_authenticated" on public.app_state;
create policy "app_state_write_authenticated"
on public.app_state
for insert
to authenticated
with check (true);

drop policy if exists "app_state_update_authenticated" on public.app_state;
create policy "app_state_update_authenticated"
on public.app_state
for update
to authenticated
using (true)
with check (true);

insert into public.app_state (scope, payload)
values ('default', '{}'::jsonb)
on conflict (scope) do nothing;
