create or replace function public._ensure_user_profile_from_identity(
  p_auth_user_id uuid,
  p_email text default null,
  p_first_name text default null,
  p_last_name text default null,
  p_phone text default null,
  p_status text default null
)
returns public.user_profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.user_profiles%rowtype;
  v_email text;
  v_auth_user auth.users%rowtype;
  v_first_name text;
  v_last_name text;
  v_phone text;
  v_status text;
  v_meta jsonb;
begin
  if p_auth_user_id is null then
    raise exception 'auth_user_id is required';
  end if;

  select u.*
    into v_auth_user
  from auth.users u
  where u.id = p_auth_user_id
  limit 1;

  v_meta := coalesce(v_auth_user.raw_user_meta_data, '{}'::jsonb);
  v_email := lower(coalesce(
    nullif(trim(coalesce(p_email, v_auth_user.email, v_auth_user.raw_user_meta_data ->> 'email', '')), ''),
    ''
  ));

  select *
    into v_profile
  from public.user_profiles
  where auth_user_id = p_auth_user_id
  limit 1;

  if found then
    update public.user_profiles
       set email = case
                     when coalesce(nullif(trim(lower(coalesce(p_email, ''))), ''), '') <> '' then lower(trim(p_email))
                     else email
                   end,
           first_name = coalesce(nullif(trim(p_first_name), ''), first_name),
           last_name = coalesce(nullif(trim(p_last_name), ''), last_name),
           phone = coalesce(nullif(trim(p_phone), ''), phone),
           status = coalesce(nullif(trim(p_status), ''), status),
           updated_at = now()
     where id = v_profile.id
    returning * into v_profile;
    return v_profile;
  end if;

  if v_email <> '' then
    select *
      into v_profile
    from public.user_profiles
    where lower(email) = v_email
    order by created_at asc
    limit 1;

    if found then
      update public.user_profiles
         set auth_user_id = p_auth_user_id,
             email = lower(v_email),
             first_name = coalesce(nullif(trim(coalesce(p_first_name, first_name)), ''), first_name),
             last_name = coalesce(nullif(trim(coalesce(p_last_name, last_name)), ''), last_name),
             phone = coalesce(nullif(trim(p_phone), ''), phone),
             status = coalesce(nullif(trim(coalesce(p_status, 'active')), ''), status),
             updated_at = now()
       where id = v_profile.id
       returning * into v_profile;
      return v_profile;
    end if;
  end if;

  if v_email = '' then
    v_email := lower('unknown+' || replace(p_auth_user_id::text, '-', '') || '@invalid.local');
  end if;

  v_first_name := coalesce(nullif(trim(coalesce(p_first_name, v_meta ->> 'first_name', v_meta ->> 'firstName', v_meta ->> 'name', '')), ''), 'Пользователь');
  v_last_name := coalesce(nullif(trim(coalesce(p_last_name, v_meta ->> 'last_name', v_meta ->> 'lastName', '')), ''), '');
  v_phone := coalesce(nullif(trim(coalesce(p_phone, v_meta ->> 'phone', '')), ''), '');
  v_status := coalesce(nullif(trim(coalesce(p_status, 'active')), ''), 'active');

  insert into public.user_profiles (
    auth_user_id,
    email,
    first_name,
    last_name,
    phone,
    status
  ) values (
    p_auth_user_id,
    v_email,
    v_first_name,
    v_last_name,
    v_phone,
    v_status
  )
  returning * into v_profile;

  return v_profile;
end;
$$;

revoke all on function public._ensure_user_profile_from_identity(uuid, text, text, text, text, text) from public;

alter table public.organizations add column if not exists city text not null default '';
alter table public.organizations add column if not exists address text not null default '';
alter table public.organizations add column if not exists deleted_at timestamptz;

alter table if exists public.organization_members drop constraint if exists organization_members_role_check;
alter table public.organization_members add constraint organization_members_role_check check (
  role in (
    'platform_owner',
    'platform_moderator',
    'owner',
    'admin',
    'organization_owner',
    'director',
    'manager',
    'buyer',
    'chef',
    'sous_chef',
    'bar_manager',
    'senior_bartender',
    'accountant',
    'warehouse',
    'supplier'
  )
);

create table if not exists public.permission_catalog (
  key text primary key,
  title text not null,
  description text not null default '',
  module text not null default '',
  is_platform_permission boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permission_defaults (
  role text not null,
  permission_key text not null references public.permission_catalog(key) on delete cascade,
  allowed boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (role, permission_key)
);

create table if not exists public.member_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_member_id uuid not null references public.organization_members(id) on delete cascade,
  permission_key text not null references public.permission_catalog(key) on delete cascade,
  allowed boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_permission_overrides_unique unique (organization_member_id, permission_key)
);

create table if not exists public.platform_staff_roles (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid not null references public.user_profiles(id) on delete cascade,
  role text not null check (role in ('platform_owner', 'platform_moderator')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_staff_roles_user_unique unique (user_profile_id)
);

create table if not exists public.platform_member_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  platform_staff_role_id uuid not null references public.platform_staff_roles(id) on delete cascade,
  permission_key text not null references public.permission_catalog(key) on delete cascade,
  allowed boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_member_permission_overrides_unique unique (platform_staff_role_id, permission_key)
);

create index if not exists idx_member_permission_overrides_member_id on public.member_permission_overrides(organization_member_id);
create index if not exists idx_member_permission_overrides_permission_key on public.member_permission_overrides(permission_key);
create index if not exists idx_platform_staff_roles_user_profile_id on public.platform_staff_roles(user_profile_id);
create index if not exists idx_platform_member_permission_overrides_staff_role_id on public.platform_member_permission_overrides(platform_staff_role_id);
create index if not exists idx_platform_member_permission_overrides_permission_key on public.platform_member_permission_overrides(permission_key);

drop trigger if exists set_updated_at_member_permission_overrides on public.member_permission_overrides;
create trigger set_updated_at_member_permission_overrides
before update on public.member_permission_overrides
for each row execute procedure public.tg_set_updated_at();

drop trigger if exists set_updated_at_platform_staff_roles on public.platform_staff_roles;
create trigger set_updated_at_platform_staff_roles
before update on public.platform_staff_roles
for each row execute procedure public.tg_set_updated_at();

drop trigger if exists set_updated_at_platform_member_permission_overrides on public.platform_member_permission_overrides;
create trigger set_updated_at_platform_member_permission_overrides
before update on public.platform_member_permission_overrides
for each row execute procedure public.tg_set_updated_at();

insert into public.permission_catalog (
  key,
  title,
  description,
  module,
  is_platform_permission
)
select *
from (
  values
    ('platform.view_all_organizations', 'Просмотр всех организаций', 'Платформенная возможность видеть все организации', 'platform', true),
    ('platform.manage_all_organizations', 'Управление всеми организациями', 'Платформенная возможность редактировать и модерировать все организации', 'platform', true),
    ('platform.manage_platform_users', 'Управление пользователями платформы', 'Платформенная возможность управлять пользователями платформы', 'platform', true),
    ('platform.view_platform_stats', 'Просмотр статистики платформы', 'Платформенная возможность просматривать статистику', 'platform', true),
    ('platform.monitoring', 'Мониторинг платформы', 'Платформенная возможность мониторинга', 'platform', true),
    ('platform.support_access', 'Доступ поддержки', 'Платформенная возможность поддержки', 'platform', true),
    ('organization.view', 'Просмотр организации', 'Просмотр сведений об организации', 'organization', false),
    ('organization.edit', 'Редактирование организации', 'Изменение данных организации', 'organization', false),
    ('organization.archive', 'Архивация организации', 'Архивация и восстановление организации', 'organization', false),
    ('organization.delete', 'Удаление организации', 'Soft delete организации', 'organization', false),
    ('organization.members.view', 'Просмотр участников', 'Просмотр списка участников организации', 'organization', false),
    ('organization.members.invite', 'Приглашение участников', 'Добавление участников организации', 'organization', false),
    ('organization.members.edit_role', 'Изменение роли участника', 'Смена роли участника организации', 'organization', false),
    ('organization.members.disable', 'Отключение участника', 'Отключение участника организации', 'organization', false),
    ('organization.members.permissions', 'Управление правами участников', 'Настройка прав внутри организации', 'organization', false),
    ('suppliers.view', 'Просмотр поставщиков', 'Просмотр списка поставщиков', 'suppliers', false),
    ('suppliers.create', 'Создание поставщика', 'Создание поставщика', 'suppliers', false),
    ('suppliers.edit', 'Редактирование поставщика', 'Редактирование поставщика', 'suppliers', false),
    ('suppliers.delete', 'Удаление поставщика', 'Удаление поставщика', 'suppliers', false),
    ('price_lists.view', 'Просмотр прайсов', 'Просмотр прайс-листов', 'prices', false),
    ('price_lists.upload', 'Загрузка прайсов', 'Загрузка прайс-листов', 'prices', false),
    ('price_lists.edit', 'Редактирование прайсов', 'Редактирование прайс-листов', 'prices', false),
    ('price_lists.delete', 'Удаление прайсов', 'Удаление прайс-листов', 'prices', false),
    ('orders.view', 'Просмотр заказов', 'Просмотр заказов', 'orders', false),
    ('orders.create', 'Создание заказов', 'Создание заказов', 'orders', false),
    ('orders.approve', 'Подтверждение заказов', 'Подтверждение заказов', 'orders', false),
    ('orders.history', 'История заказов', 'Просмотр истории заказов', 'orders', false),
    ('cart.view', 'Просмотр корзины', 'Просмотр корзины', 'orders', false),
    ('cart.edit', 'Редактирование корзины', 'Редактирование корзины', 'orders', false),
    ('tenders.view', 'Просмотр тендеров', 'Просмотр тендеров', 'tenders', false),
    ('tenders.create', 'Создание тендеров', 'Создание тендеров', 'tenders', false),
    ('tenders.manage', 'Управление тендерами', 'Управление тендерами', 'tenders', false),
    ('tech_cards.view', 'Просмотр техкарт', 'Просмотр технологических карт', 'tech_cards', false),
    ('tech_cards.create', 'Создание техкарт', 'Создание технологических карт', 'tech_cards', false),
    ('tech_cards.edit', 'Редактирование техкарт', 'Редактирование технологических карт', 'tech_cards', false),
    ('tech_cards.delete', 'Удаление техкарт', 'Удаление технологических карт', 'tech_cards', false),
    ('calculator.view', 'Калькулятор', 'Доступ к калькулятору', 'calculator', false),
    ('analytics.view', 'Аналитика', 'Просмотр аналитики', 'analytics', false),
    ('reports.view', 'Отчёты', 'Просмотр отчётов', 'reports', false),
    ('stock.view', 'Склад', 'Просмотр склада и остатков', 'stock', false),
    ('documents.view', 'Документы', 'Просмотр документов', 'documents', false),
    ('supplier_portal.upload_price', 'Загрузка прайса поставщика', 'Загрузка/обновление прайс-листа поставщика', 'supplier_portal', false),
    ('supplier_portal.view_orders', 'Просмотр заказов поставщика', 'Просмотр заказов по своим поставкам', 'supplier_portal', false),
    ('supplier_portal.accept_orders', 'Подтверждение заказов поставщика', 'Подтверждение заказов поставщика', 'supplier_portal', false),
    ('supplier_portal.view_shipments_stats', 'Статистика отгрузок', 'Просмотр статистики отгрузок поставщика', 'supplier_portal', false)
) as seed(key, title, description, module, is_platform_permission)
on conflict (key) do update
set title = excluded.title,
    description = excluded.description,
    module = excluded.module,
    is_platform_permission = excluded.is_platform_permission;

insert into public.role_permission_defaults(role, permission_key, allowed)
select role_name, permission_key, true
from (values ('organization_owner'), ('director'), ('admin'), ('owner')) as roles(role_name)
cross join unnest(array[
  'organization.view',
  'organization.edit',
  'organization.archive',
  'organization.delete',
  'organization.members.view',
  'organization.members.invite',
  'organization.members.edit_role',
  'organization.members.disable',
  'organization.members.permissions',
  'suppliers.view',
  'suppliers.create',
  'suppliers.edit',
  'suppliers.delete',
  'price_lists.view',
  'price_lists.upload',
  'price_lists.edit',
  'price_lists.delete',
  'orders.view',
  'orders.create',
  'orders.approve',
  'orders.history',
  'cart.view',
  'cart.edit',
  'tenders.view',
  'tenders.create',
  'tenders.manage',
  'tech_cards.view',
  'tech_cards.create',
  'tech_cards.edit',
  'tech_cards.delete',
  'calculator.view',
  'analytics.view',
  'reports.view',
  'stock.view',
  'documents.view'
]) as permissions(permission_key)
on conflict (role, permission_key) do update
set allowed = excluded.allowed;

insert into public.role_permission_defaults(role, permission_key, allowed)
select role_name, permission_key, true
from (values ('manager')) as roles(role_name)
cross join unnest(array[
  'organization.view',
  'organization.members.view',
  'suppliers.view',
  'suppliers.create',
  'suppliers.edit',
  'price_lists.view',
  'price_lists.upload',
  'price_lists.edit',
  'orders.view',
  'orders.create',
  'orders.history',
  'cart.view',
  'cart.edit',
  'tenders.view',
  'tenders.create',
  'tenders.manage',
  'tech_cards.view',
  'tech_cards.create',
  'tech_cards.edit',
  'tech_cards.delete',
  'calculator.view',
  'analytics.view'
]) as permissions(permission_key)
on conflict (role, permission_key) do update
set allowed = excluded.allowed;

insert into public.role_permission_defaults(role, permission_key, allowed)
select role_name, permission_key, true
from (values ('buyer')) as roles(role_name)
cross join unnest(array[
  'organization.view',
  'organization.members.view',
  'suppliers.view',
  'price_lists.view',
  'orders.view',
  'orders.create',
  'orders.history',
  'cart.view',
  'cart.edit',
  'tenders.view',
  'tenders.create',
  'analytics.view'
]) as permissions(permission_key)
on conflict (role, permission_key) do update
set allowed = excluded.allowed;

insert into public.role_permission_defaults(role, permission_key, allowed)
select role_name, permission_key, true
from (values ('chef'), ('sous_chef')) as roles(role_name)
cross join unnest(array[
  'organization.view',
  'organization.members.view',
  'suppliers.view',
  'price_lists.view',
  'orders.view',
  'orders.create',
  'orders.history',
  'cart.view',
  'cart.edit',
  'tenders.view',
  'tenders.create',
  'tenders.manage',
  'tech_cards.view',
  'tech_cards.create',
  'tech_cards.edit',
  'tech_cards.delete',
  'calculator.view',
  'analytics.view'
]) as permissions(permission_key)
on conflict (role, permission_key) do update
set allowed = excluded.allowed;

insert into public.role_permission_defaults(role, permission_key, allowed)
select role_name, permission_key, true
from (values ('bar_manager')) as roles(role_name)
cross join unnest(array[
  'organization.view',
  'organization.members.view',
  'suppliers.view',
  'price_lists.view',
  'orders.view',
  'orders.create',
  'orders.history',
  'cart.view',
  'cart.edit',
  'tenders.view',
  'tenders.create',
  'tenders.manage',
  'tech_cards.view',
  'tech_cards.create',
  'tech_cards.edit',
  'tech_cards.delete',
  'calculator.view',
  'analytics.view'
]) as permissions(permission_key)
on conflict (role, permission_key) do update
set allowed = excluded.allowed;

insert into public.role_permission_defaults(role, permission_key, allowed)
select role_name, permission_key, true
from (values ('senior_bartender')) as roles(role_name)
cross join unnest(array[
  'organization.view',
  'organization.members.view',
  'suppliers.view',
  'price_lists.view',
  'orders.view',
  'orders.create',
  'orders.history',
  'cart.view',
  'cart.edit',
  'tenders.view',
  'tenders.create',
  'tech_cards.view',
  'tech_cards.create',
  'tech_cards.edit',
  'tech_cards.delete',
  'calculator.view'
]) as permissions(permission_key)
on conflict (role, permission_key) do update
set allowed = excluded.allowed;

insert into public.role_permission_defaults(role, permission_key, allowed)
select role_name, permission_key, true
from (values ('accountant')) as roles(role_name)
cross join unnest(array[
  'organization.view',
  'orders.history',
  'analytics.view',
  'reports.view',
  'documents.view'
]) as permissions(permission_key)
on conflict (role, permission_key) do update
set allowed = excluded.allowed;

insert into public.role_permission_defaults(role, permission_key, allowed)
select role_name, permission_key, true
from (values ('warehouse')) as roles(role_name)
cross join unnest(array[
  'organization.view',
  'stock.view',
  'orders.view',
  'orders.history',
  'suppliers.view'
]) as permissions(permission_key)
on conflict (role, permission_key) do update
set allowed = excluded.allowed;

insert into public.role_permission_defaults(role, permission_key, allowed)
select role_name, permission_key, true
from (values ('supplier')) as roles(role_name)
cross join unnest(array[
  'supplier_portal.upload_price',
  'supplier_portal.view_orders',
  'supplier_portal.accept_orders',
  'supplier_portal.view_shipments_stats'
]) as permissions(permission_key)
on conflict (role, permission_key) do update
set allowed = excluded.allowed;

insert into public.role_permission_defaults(role, permission_key, allowed)
select 'platform_moderator', permission_key, false
from unnest(array[
  'platform.view_all_organizations',
  'platform.manage_all_organizations',
  'platform.manage_platform_users',
  'platform.view_platform_stats',
  'platform.monitoring',
  'platform.support_access'
]) as permission_key
on conflict (role, permission_key) do update
set allowed = excluded.allowed;

create or replace function public.ensure_user_profile()
returns table (
  profile_id uuid,
  auth_user_id uuid,
  email text,
  first_name text,
  last_name text,
  status text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.user_profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth.uid() is required';
  end if;

  v_profile := public._ensure_user_profile_from_identity(auth.uid(), null, null, null, null, null);

  return query
  select
    v_profile.id,
    v_profile.auth_user_id,
    v_profile.email,
    v_profile.first_name,
    v_profile.last_name,
    v_profile.status;
end;
$$;

revoke all on function public.ensure_user_profile() from public;
grant execute on function public.ensure_user_profile() to authenticated;

create or replace function public._is_platform_owner()
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.user_profiles up
    join public.organization_members om on om.user_profile_id = up.id
    where up.auth_user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('platform_owner', 'owner')
  )
  or exists (
    select 1
    from public.platform_staff_roles psr
    join public.user_profiles up on up.id = psr.user_profile_id
    where up.auth_user_id = auth.uid()
      and psr.status = 'active'
      and psr.role = 'platform_owner'
  );
$$;

revoke all on function public._is_platform_owner() from public;

create or replace function public.current_user_is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = public, auth
set row_security = off
as $$
  select public._is_platform_owner()
$$;

create or replace function public.current_user_platform_role()
returns text
language sql
stable
security definer
set search_path = public, auth
set row_security = off
as $$
  select case
    when public._is_platform_owner() then 'platform_owner'
    when exists (
      select 1
      from public.platform_staff_roles psr
      join public.user_profiles up on up.id = psr.user_profile_id
      where up.auth_user_id = auth.uid()
        and psr.status = 'active'
        and psr.role = 'platform_moderator'
    ) then 'platform_moderator'
    else 'unassigned'
  end
$$;

create or replace function public.current_user_platform_staff_role_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
set row_security = off
as $$
  select psr.id
  from public.platform_staff_roles psr
  join public.user_profiles up on up.id = psr.user_profile_id
  where up.auth_user_id = auth.uid()
    and psr.status = 'active'
    and psr.role = 'platform_moderator'
  limit 1
$$;

create or replace function public.current_user_role_for_organization(target_org_id uuid)
returns text
language sql
stable
security definer
set search_path = public, auth
set row_security = off
as $$
  select om.role
  from public.organization_members om
  join public.user_profiles up on up.id = om.user_profile_id
  where up.auth_user_id = auth.uid()
    and om.status = 'active'
    and om.organization_id = target_org_id
  order by case om.role
    when 'platform_owner' then 0
    when 'owner' then 0
    when 'platform_moderator' then 1
    when 'organization_owner' then 1
    when 'director' then 1
    when 'admin' then 2
    when 'manager' then 3
    when 'buyer' then 4
    when 'chef' then 5
    when 'sous_chef' then 6
    when 'bar_manager' then 7
    when 'senior_bartender' then 8
    when 'accountant' then 9
    when 'warehouse' then 10
    when 'supplier' then 11
    else 99 end
  limit 1
$$;

create or replace function public.has_permission(
  target_organization_id uuid,
  permission_key text
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
set row_security = off
as $$
declare
  v_key text := lower(trim(coalesce(permission_key, '')));
  v_catalog public.permission_catalog%rowtype;
  v_org_role text := 'unassigned';
  v_membership_id uuid;
  v_default_allowed boolean := false;
  v_override_allowed boolean;
  v_platform_staff_role_id uuid;
begin
  if auth.uid() is null or v_key = '' then
    return false;
  end if;

  select *
    into v_catalog
  from public.permission_catalog pc
  where pc.key = v_key
  limit 1;

  if not found then
    return false;
  end if;

  if public._is_platform_owner() then
    return true;
  end if;

  if v_catalog.is_platform_permission then
    if public.current_user_platform_role() <> 'platform_moderator' then
      return false;
    end if;

    select public.current_user_platform_staff_role_id()
      into v_platform_staff_role_id;

    if v_platform_staff_role_id is null then
      return false;
    end if;

    select mpo.allowed
      into v_override_allowed
    from public.platform_member_permission_overrides mpo
    where mpo.platform_staff_role_id = v_platform_staff_role_id
      and mpo.permission_key = v_key
    limit 1;

    if found then
      return coalesce(v_override_allowed, false);
    end if;

    select rpd.allowed
      into v_default_allowed
    from public.role_permission_defaults rpd
    where rpd.role = 'platform_moderator'
      and rpd.permission_key = v_key
    limit 1;

    return coalesce(v_default_allowed, false);
  end if;

  if target_organization_id is null then
    return false;
  end if;

  select om.id, om.role
    into v_membership_id, v_org_role
  from public.organization_members om
  join public.user_profiles up on up.id = om.user_profile_id
  where up.auth_user_id = auth.uid()
    and om.organization_id = target_organization_id
    and om.status = 'active'
  order by case om.role
    when 'platform_owner' then 0
    when 'owner' then 0
    when 'organization_owner' then 1
    when 'director' then 1
    when 'admin' then 2
    when 'manager' then 3
    when 'buyer' then 4
    when 'chef' then 5
    when 'sous_chef' then 6
    when 'bar_manager' then 7
    when 'senior_bartender' then 8
    when 'accountant' then 9
    when 'warehouse' then 10
    when 'supplier' then 11
    else 99 end
  limit 1;

  if v_membership_id is null then
    return false;
  end if;

  select rpd.allowed
    into v_default_allowed
  from public.role_permission_defaults rpd
  where rpd.role = v_org_role
    and rpd.permission_key = v_key
  limit 1;

  if found then
    select mpo.allowed
      into v_override_allowed
    from public.member_permission_overrides mpo
    where mpo.organization_member_id = v_membership_id
      and mpo.permission_key = v_key
    limit 1;

    if found then
      return coalesce(v_override_allowed, false);
    end if;

    return coalesce(v_default_allowed, false);
  end if;

  return false;
end;
$$;

create or replace function public.get_my_permissions(
  target_organization_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
set row_security = off
as $$
declare
  v_permissions jsonb;
begin
  if auth.uid() is null then
    return '[]'::jsonb;
  end if;

  if public._is_platform_owner() then
    select coalesce(jsonb_agg(pc.key order by pc.key), '[]'::jsonb)
      into v_permissions
    from public.permission_catalog pc;
    return v_permissions;
  end if;

  select coalesce(jsonb_agg(perms.key order by perms.key), '[]'::jsonb)
    into v_permissions
  from (
    select pc.key
    from public.permission_catalog pc
    where public.has_permission(target_organization_id, pc.key)
  ) perms;

  return coalesce(v_permissions, '[]'::jsonb);
end;
$$;

create or replace function public.get_my_session()
returns table (
  "profileId" uuid,
  "authUserId" uuid,
  email text,
  "firstName" text,
  "lastName" text,
  status text,
  memberships jsonb,
  organizations jsonb,
  "activeOrganizationId" uuid,
  "activeOrganizationName" text,
  role text,
  "noOrganization" boolean,
  "membershipsCount" integer,
  "organizationsCount" integer,
  permissions jsonb,
  "activeOrganizationPermissions" jsonb,
  "errorMessage" text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.user_profiles%rowtype;
  v_memberships jsonb;
  v_organizations jsonb;
  v_active_org_id uuid;
  v_active_org_name text;
  v_role text := 'unassigned';
  v_error_message text;
  v_memberships_count integer := 0;
  v_organizations_count integer := 0;
  v_is_owner boolean := false;
  v_permissions jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'auth.uid() is required';
  end if;

  v_profile := public._ensure_user_profile_from_identity(auth.uid(), null, null, null, null, null);

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', om.id,
             'organization_id', om.organization_id,
             'user_profile_id', om.user_profile_id,
             'role', om.role,
             'status', om.status,
             'created_at', om.created_at,
             'updated_at', om.updated_at
           )
           order by om.created_at asc
         ), '[]'::jsonb)
    into v_memberships
  from public.organization_members om
  where om.user_profile_id = v_profile.id
    and om.status = 'active';
  v_memberships_count := coalesce(jsonb_array_length(v_memberships), 0);
  v_is_owner := public._is_platform_owner();

  if v_is_owner then
    select coalesce(jsonb_agg(
             jsonb_build_object(
               'id', o.id,
               'name', o.name,
               'type', o.type,
               'status', o.status,
               'created_at', o.created_at,
               'updated_at', o.updated_at
             )
             order by o.created_at asc
           ), '[]'::jsonb)
      into v_organizations
    from public.organizations o
    where o.status = 'active';
  else
    select coalesce(jsonb_agg(
             jsonb_build_object(
               'id', o.id,
               'name', o.name,
               'type', o.type,
               'status', o.status,
               'created_at', o.created_at,
               'updated_at', o.updated_at
             )
             order by o.created_at asc
           ), '[]'::jsonb)
      into v_organizations
    from public.organization_members om
    join public.organizations o on o.id = om.organization_id
    where om.user_profile_id = v_profile.id
      and om.status = 'active'
      and o.status = 'active';
  end if;
  v_organizations_count := coalesce(jsonb_array_length(v_organizations), 0);

  select om.organization_id, o.name, om.role
    into v_active_org_id, v_active_org_name, v_role
  from public.organization_members om
  left join public.organizations o on o.id = om.organization_id
  where om.user_profile_id = v_profile.id
    and om.status = 'active'
  order by om.created_at asc
  limit 1;

  if v_is_owner and v_active_org_id is null and v_organizations_count > 0 then
    select o.id, o.name
      into v_active_org_id, v_active_org_name
    from public.organizations o
    where o.status = 'active'
    order by o.created_at asc
    limit 1;
    if v_role = 'unassigned' then
      v_role := 'platform_owner';
    end if;
  end if;

  if v_memberships_count > 0 and v_organizations_count = 0 then
    v_error_message := 'Не удалось загрузить организации пользователя';
  end if;

  if v_is_owner and v_organizations_count > 0 then
    v_error_message := null;
  end if;

  if v_is_owner and v_organizations_count > 0 and v_active_org_id is not null then
    v_memberships_count := greatest(v_memberships_count, 1);
  end if;

  if v_is_owner and v_organizations_count > 0 then
    v_error_message := null;
  end if;

  v_permissions := public.get_my_permissions(v_active_org_id);

  return query
  select
    v_profile.id,
    v_profile.auth_user_id,
    v_profile.email,
    v_profile.first_name,
    v_profile.last_name,
    v_profile.status,
    coalesce(v_memberships, '[]'::jsonb),
    coalesce(v_organizations, '[]'::jsonb),
    v_active_org_id,
    v_active_org_name,
    coalesce(v_role, 'unassigned'),
    case
      when v_memberships_count > 0 then false
      when v_is_owner and v_organizations_count > 0 then false
      else true
    end,
    v_memberships_count,
    v_organizations_count,
    coalesce(v_permissions, '[]'::jsonb),
    coalesce(v_permissions, '[]'::jsonb),
    v_error_message;
end;
$$;

revoke all on function public.get_my_session() from public;
grant execute on function public.get_my_session() to authenticated;

create or replace function public.owner_list_users()
returns table (
  profile_id uuid,
  auth_user_id uuid,
  email text,
  first_name text,
  last_name text,
  status text,
  created_at timestamptz,
  role text,
  no_organization boolean,
  memberships jsonb,
  organizations jsonb
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public._is_platform_owner() then
    perform 1
    from public.organization_members om
    join public.user_profiles up on up.id = om.user_profile_id
    where up.auth_user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('admin', 'organization_owner', 'director', 'owner')
    limit 1;
    if not found then
      raise exception 'Forbidden';
    end if;
  end if;

  return query
  select
    up.id as profile_id,
    up.auth_user_id,
    up.email,
    up.first_name,
    up.last_name,
    up.status,
    up.created_at,
    coalesce((
      select om.role
      from public.organization_members om
      where om.user_profile_id = up.id
        and om.status = 'active'
      order by om.created_at asc
      limit 1
    ), 'unassigned') as role,
    case when exists (
      select 1
      from public.organization_members om
      where om.user_profile_id = up.id
        and om.status = 'active'
    ) then false else true end as no_organization,
    coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id', om.id,
                 'organization_id', om.organization_id,
                 'user_profile_id', om.user_profile_id,
                 'role', om.role,
                 'status', om.status,
                 'created_at', om.created_at,
                 'updated_at', om.updated_at
               )
               order by om.created_at asc
             )
      from public.organization_members om
      where om.user_profile_id = up.id
    ), '[]'::jsonb) as memberships,
    coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id', o.id,
                 'name', o.name,
                 'type', o.type,
                 'status', o.status,
                 'created_at', o.created_at,
                 'updated_at', o.updated_at
               )
               order by o.created_at asc
             )
      from public.organization_members om
      join public.organizations o on o.id = om.organization_id
      where om.user_profile_id = up.id
        and om.status = 'active'
    ), '[]'::jsonb) as organizations
  from public.user_profiles up
  order by up.created_at desc;
end;
$$;

revoke all on function public.owner_list_users() from public;
grant execute on function public.owner_list_users() to authenticated;

create or replace function public.owner_create_organization(
  target_name text,
  target_type text,
  target_city text,
  target_address text
)
returns table (
  organization_id uuid,
  name text,
  type text,
  status text,
  city text,
  address text,
  created_at timestamptz,
  updated_at timestamptz,
  membership_id uuid,
  user_profile_id uuid,
  role text,
  membership_status text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_org public.organizations%rowtype;
  v_profile public.user_profiles%rowtype;
  v_role text := 'organization_owner';
  v_actor_role text := 'unassigned';
  v_membership_id uuid;
begin
  if auth.uid() is null then
    raise exception 'auth.uid() is required';
  end if;

  select coalesce(om.role, 'unassigned')
    into v_actor_role
  from public.organization_members om
  join public.user_profiles up on up.id = om.user_profile_id
  where up.auth_user_id = auth.uid()
    and om.status = 'active'
  order by case om.role
    when 'platform_owner' then 0
    when 'owner' then 0
    when 'admin' then 1
    when 'organization_owner' then 2
    else 99 end
  limit 1;

  if not public._is_platform_owner() and v_actor_role not in ('admin', 'organization_owner', 'director', 'owner') then
    raise exception 'Forbidden';
  end if;

  v_profile := public._ensure_user_profile_from_identity(auth.uid(), null, null, null, null, 'active');
  if public._is_platform_owner() then
    v_role := 'platform_owner';
  end if;

  insert into public.organizations (
    name,
    type,
    status,
    city,
    address
  ) values (
    coalesce(nullif(trim(target_name), ''), 'Новая организация'),
    coalesce(nullif(trim(target_type), ''), 'restaurant'),
    'active',
    coalesce(nullif(trim(target_city), ''), ''),
    coalesce(nullif(trim(target_address), ''), '')
  )
  returning * into v_org;

  insert into public.organization_members (
    organization_id,
    user_profile_id,
    role,
    status
  ) values (
    v_org.id,
    v_profile.id,
    v_role,
    'active'
  ) returning id into v_membership_id;

  return query
  select
    v_org.id,
    v_org.name,
    v_org.type,
    v_org.status,
    v_org.city,
    v_org.address,
    v_org.created_at,
    v_org.updated_at,
    v_membership_id,
    v_profile.id,
    v_role,
    'active';
end;
$$;

revoke all on function public.owner_create_organization(text, text, text, text) from public;
grant execute on function public.owner_create_organization(text, text, text, text) to authenticated;

create or replace function public.owner_list_organizations(
  target_status text default null
)
returns table (
  id uuid,
  name text,
  type text,
  status text,
  city text,
  address text,
  created_at timestamptz,
  updated_at timestamptz,
  members_count integer,
  active_members_count integer
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_is_owner boolean := public._is_platform_owner();
  v_role text := 'unassigned';
begin
  if auth.uid() is null then
    raise exception 'auth.uid() is required';
  end if;

  if not v_is_owner then
    select coalesce(om.role, 'unassigned')
      into v_role
    from public.organization_members om
    join public.user_profiles up on up.id = om.user_profile_id
    where up.auth_user_id = auth.uid()
      and om.status = 'active'
    order by case om.role
      when 'admin' then 1
      when 'organization_owner' then 2
      when 'manager' then 3
      when 'buyer' then 4
      when 'chef' then 5
      when 'bar_manager' then 6
      when 'accountant' then 7
      when 'warehouse' then 8
      else 99 end
    limit 1;
  end if;

  return query
  select
    o.id,
    o.name,
    o.type,
    o.status,
    coalesce(o.city, '') as city,
    coalesce(o.address, '') as address,
    o.created_at,
    o.updated_at,
    count(distinct om.id)::integer as members_count,
    count(distinct case when om.status = 'active' then om.id end)::integer as active_members_count
  from public.organizations o
  left join public.organization_members om on om.organization_id = o.id
  where (
    v_is_owner
    or exists (
      select 1
      from public.organization_members my_om
      join public.user_profiles up on up.id = my_om.user_profile_id
      where up.auth_user_id = auth.uid()
        and my_om.organization_id = o.id
        and my_om.status = 'active'
    )
    or (v_role in ('organization_owner', 'director', 'admin', 'owner') and public.current_user_can_access_organization(o.id))
  )
    and (target_status is null or lower(o.status) = lower(target_status))
  group by o.id
  order by o.created_at asc;
end;
$$;

revoke all on function public.owner_list_organizations(text) from public;
grant execute on function public.owner_list_organizations(text) to authenticated;

create or replace function public.owner_update_organization(
  target_organization_id uuid,
  target_name text,
  target_type text,
  target_status text,
  target_city text,
  target_address text
)
returns table (
  id uuid,
  name text,
  type text,
  status text,
  city text,
  address text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_org public.organizations%rowtype;
  v_role text := 'unassigned';
begin
  if target_organization_id is null then
    raise exception 'organization_id is required';
  end if;
  if auth.uid() is null then
    raise exception 'auth.uid() is required';
  end if;

  select coalesce(om.role, 'unassigned')
    into v_role
  from public.organization_members om
  join public.user_profiles up on up.id = om.user_profile_id
  where up.auth_user_id = auth.uid()
    and om.organization_id = target_organization_id
    and om.status = 'active'
  order by case om.role
    when 'platform_owner' then 0
    when 'owner' then 0
    when 'admin' then 1
    when 'organization_owner' then 2
    else 99 end
  limit 1;

  if not public._is_platform_owner() and v_role not in ('admin', 'organization_owner', 'director', 'owner') then
    raise exception 'Forbidden';
  end if;

update public.organizations o
     set name = coalesce(nullif(trim(target_name), ''), o.name),
         type = coalesce(nullif(trim(target_type), ''), o.type),
         status = coalesce(nullif(trim(target_status), ''), o.status),
         city = coalesce(nullif(trim(target_city), ''), o.city),
         address = coalesce(nullif(trim(target_address), ''), o.address),
         deleted_at = case
           when lower(coalesce(target_status, '')) = 'deleted' then now()
           when lower(coalesce(target_status, '')) = 'active' then null
           when lower(coalesce(target_status, '')) = 'archived' then null
           else o.deleted_at
         end,
         updated_at = now()
   where o.id = target_organization_id
   returning * into v_org;

  if not found then
    raise exception 'organization not found';
  end if;

  return query
  select v_org.id, v_org.name, v_org.type, v_org.status, coalesce(v_org.city, ''), coalesce(v_org.address, ''), v_org.created_at, v_org.updated_at;
end;
$$;

revoke all on function public.owner_update_organization(uuid, text, text, text, text, text) from public;
grant execute on function public.owner_update_organization(uuid, text, text, text, text, text) to authenticated;

create or replace function public.owner_archive_organization(
  target_organization_id uuid
)
returns table (
  id uuid,
  name text,
  type text,
  status text,
  city text,
  address text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public._is_platform_owner() then
    raise exception 'Forbidden';
  end if;
  return query
  select * from public.owner_update_organization(
    target_organization_id,
    null,
    null,
    'archived',
    null,
    null
  );
end;
$$;

revoke all on function public.owner_archive_organization(uuid) from public;
grant execute on function public.owner_archive_organization(uuid) to authenticated;

create or replace function public.owner_restore_organization(
  target_organization_id uuid
)
returns table (
  id uuid,
  name text,
  type text,
  status text,
  city text,
  address text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  return query
  select * from public.owner_update_organization(
    target_organization_id,
    null,
    null,
    'active',
    null,
    null
  );
end;
$$;

revoke all on function public.owner_restore_organization(uuid) from public;
grant execute on function public.owner_restore_organization(uuid) to authenticated;

create or replace function public.owner_delete_organization(
  target_organization_id uuid
)
returns table (
  id uuid,
  name text,
  type text,
  status text,
  city text,
  address text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  return query
  select * from public.owner_update_organization(
    target_organization_id,
    null,
    null,
    'deleted',
    null,
    null
  );
end;
$$;

revoke all on function public.owner_delete_organization(uuid) from public;
grant execute on function public.owner_delete_organization(uuid) to authenticated;

create or replace function public.owner_assign_user_to_organization(
  target_user_profile_id uuid,
  target_auth_user_id uuid,
  target_email text,
  target_organization_id uuid,
  target_role text,
  target_status text default 'active'
)
returns table (
  membership_id uuid,
  user_profile_id uuid,
  auth_user_id uuid,
  email text,
  first_name text,
  last_name text,
  organization_id uuid,
  organization_name text,
  role text,
  status text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.user_profiles%rowtype;
  v_membership public.organization_members%rowtype;
  v_org public.organizations%rowtype;
  v_actor_role text := 'unassigned';
  v_target_role text := lower(trim(coalesce(target_role, '')));
  v_profile_found boolean := false;
  v_auth_user_id uuid := target_auth_user_id;
  v_email text := lower(coalesce(nullif(trim(target_email), ''), ''));
  v_first_name text := 'Пользователь';
  v_last_name text := '';
  v_status text := lower(trim(coalesce(target_status, 'active')));
begin
  if target_organization_id is null then
    raise exception 'organization_id is required';
  end if;
  if coalesce(nullif(trim(v_target_role), ''), '') = '' then
    raise exception 'role is required';
  end if;
  if coalesce(nullif(trim(v_status), ''), '') = '' then
    v_status := 'active';
  end if;
  if v_status not in ('active', 'inactive') then
    v_status := 'active';
  end if;

  select coalesce(om.role, 'unassigned')
    into v_actor_role
  from public.organization_members om
  join public.user_profiles up on up.id = om.user_profile_id
  where up.auth_user_id = auth.uid()
    and om.organization_id = target_organization_id
    and om.status = 'active'
  order by case om.role
    when 'platform_owner' then 0
    when 'owner' then 0
    when 'admin' then 1
    when 'organization_owner' then 2
    else 99 end
  limit 1;

  if not public._is_platform_owner() and v_actor_role not in ('admin', 'organization_owner', 'director', 'owner') then
    raise exception 'Forbidden';
  end if;
  if v_target_role = 'platform_owner' and not public._is_platform_owner() then
    raise exception 'Forbidden';
  end if;

  select o.* into v_org
  from public.organizations o
  where o.id = target_organization_id
  limit 1;
  if not found then
    raise exception 'organization not found';
  end if;

  if target_user_profile_id is not null then
    select up.* into v_profile
    from public.user_profiles up
    where up.id = target_user_profile_id
    limit 1;
    v_profile_found := found;
  end if;

  if not v_profile_found and v_auth_user_id is not null then
    select * into v_profile
    from public.user_profiles
    where auth_user_id = v_auth_user_id
    limit 1;
    v_profile_found := found;
  end if;

  if not v_profile_found and v_email <> '' then
    select * into v_profile
    from public.user_profiles
    where lower(email) = v_email
    limit 1;
    v_profile_found := found;
  end if;

  if not v_profile_found then
    if v_auth_user_id is null and v_email = '' then
      raise exception 'Пользователь не найден';
    end if;
    if v_auth_user_id is null and v_email <> '' then
      select u.id, u.email, coalesce(u.raw_user_meta_data ->> 'first_name', u.raw_user_meta_data ->> 'firstName', u.raw_user_meta_data ->> 'name', 'Пользователь')
        into v_auth_user_id, v_email, v_first_name
      from auth.users u
      where lower(u.email) = v_email
      limit 1;
      if v_auth_user_id is null then
        raise exception 'Не удалось найти пользователя в auth.users';
      end if;
      select coalesce(u.raw_user_meta_data ->> 'last_name', u.raw_user_meta_data ->> 'lastName', '')
        into v_last_name
      from auth.users u
      where u.id = v_auth_user_id;
    end if;
    if v_auth_user_id is not null then
      select u.email, coalesce(u.raw_user_meta_data ->> 'first_name', u.raw_user_meta_data ->> 'firstName', u.raw_user_meta_data ->> 'name', 'Пользователь')
        into v_email, v_first_name
      from auth.users u
      where u.id = v_auth_user_id;
      if v_email is null or v_email = '' then
        v_email := lower(coalesce(nullif(trim(target_email), ''), ''));
      else
        v_email := lower(v_email);
      end if;
      select coalesce(u.raw_user_meta_data ->> 'last_name', u.raw_user_meta_data ->> 'lastName', '')
        into v_last_name
      from auth.users u
      where u.id = v_auth_user_id;
    end if;
      v_profile := public._ensure_user_profile_from_identity(
      v_auth_user_id,
      v_email,
      v_first_name,
      v_last_name,
      null,
      'active'
    );
    v_profile_found := true;
  end if;

  update public.user_profiles
     set status = 'active',
         updated_at = now()
   where id = v_profile.id
   returning * into v_profile;

  update public.organization_members om
     set role = v_target_role,
         status = v_status,
         updated_at = now()
   where om.organization_id = target_organization_id
     and om.user_profile_id = v_profile.id
   returning * into v_membership;

  if not found then
    insert into public.organization_members (
      organization_id,
      user_profile_id,
      role,
      status
    ) values (
      target_organization_id,
      v_profile.id,
      v_target_role,
      v_status
    )
    returning * into v_membership;
  end if;

  select *
    into v_membership
  from public.organization_members om
  where om.organization_id = target_organization_id
    and om.user_profile_id = v_profile.id
  limit 1;

  if not found then
    raise exception 'Не удалось добавить пользователя в организацию';
  end if;

  return query
  select
    v_membership.id,
    v_profile.id,
    v_profile.auth_user_id,
    v_profile.email,
    v_profile.first_name,
    v_profile.last_name,
    v_org.id,
    v_org.name,
    v_membership.role,
    v_membership.status;
end;
$$;

revoke all on function public.owner_assign_user_to_organization(uuid, uuid, text, uuid, text, text) from public;
grant execute on function public.owner_assign_user_to_organization(uuid, uuid, text, uuid, text, text) to authenticated;

create or replace function public.owner_update_user_role(
  target_user_profile_id uuid,
  target_organization_id uuid,
  target_role text
)
returns table (
  membership_id uuid,
  user_profile_id uuid,
  organization_id uuid,
  role text,
  status text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_membership public.organization_members%rowtype;
  v_actor_role text := 'unassigned';
  v_target_role text := lower(trim(coalesce(target_role, '')));
begin
  if target_user_profile_id is null or target_organization_id is null then
    raise exception 'profile and organization are required';
  end if;
  if coalesce(nullif(trim(v_target_role), ''), '') = '' then
    raise exception 'role is required';
  end if;

  select coalesce(om.role, 'unassigned')
    into v_actor_role
  from public.organization_members om
  join public.user_profiles up on up.id = om.user_profile_id
  where up.auth_user_id = auth.uid()
    and om.organization_id = target_organization_id
    and om.status = 'active'
  order by case om.role
    when 'platform_owner' then 0
    when 'owner' then 0
    when 'admin' then 1
    when 'organization_owner' then 2
    else 99 end
  limit 1;

  if not public._is_platform_owner() and v_actor_role not in ('admin', 'organization_owner', 'director', 'owner') then
    raise exception 'Forbidden';
  end if;
  if v_target_role = 'platform_owner' and not public._is_platform_owner() then
    raise exception 'Forbidden';
  end if;

  update public.user_profiles
     set status = 'active',
         updated_at = now()
   where id = target_user_profile_id;

  update public.organization_members om
     set role = v_target_role,
         status = 'active',
         updated_at = now()
   where om.organization_id = target_organization_id
     and om.user_profile_id = target_user_profile_id
   returning * into v_membership;

  if not found then
    raise exception 'Не удалось сохранить роль пользователя';
  end if;

  select *
    into v_membership
  from public.organization_members om
  where om.organization_id = target_organization_id
    and om.user_profile_id = target_user_profile_id
  limit 1;

  if not found then
    raise exception 'Не удалось сохранить роль пользователя';
  end if;

  return query
  select v_membership.id, v_membership.user_profile_id, v_membership.organization_id, v_membership.role, v_membership.status;
end;
$$;

revoke all on function public.owner_update_user_role(uuid, uuid, text) from public;
grant execute on function public.owner_update_user_role(uuid, uuid, text) to authenticated;

create or replace function public.owner_remove_user_from_organization(
  target_user_profile_id uuid,
  target_organization_id uuid
)
returns table (
  membership_id uuid,
  user_profile_id uuid,
  organization_id uuid,
  role text,
  status text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_membership public.organization_members%rowtype;
  v_actor_role text := 'unassigned';
begin
  if target_user_profile_id is null or target_organization_id is null then
    raise exception 'profile and organization are required';
  end if;

  select coalesce(om.role, 'unassigned')
    into v_actor_role
  from public.organization_members om
  join public.user_profiles up on up.id = om.user_profile_id
  where up.auth_user_id = auth.uid()
    and om.organization_id = target_organization_id
    and om.status = 'active'
  order by case om.role
    when 'platform_owner' then 0
    when 'owner' then 0
    when 'admin' then 1
    when 'organization_owner' then 2
    else 99 end
  limit 1;

  if not public._is_platform_owner() and v_actor_role not in ('admin', 'organization_owner', 'director', 'owner') then
    raise exception 'Forbidden';
  end if;

  update public.organization_members om
     set status = 'inactive',
         updated_at = now()
   where om.organization_id = target_organization_id
     and om.user_profile_id = target_user_profile_id
   returning * into v_membership;

  if not found then
    raise exception 'Не удалось удалить пользователя из организации';
  end if;

  return query
  select v_membership.id, v_membership.user_profile_id, v_membership.organization_id, v_membership.role, v_membership.status;
end;
$$;

revoke all on function public.owner_remove_user_from_organization(uuid, uuid) from public;
grant execute on function public.owner_remove_user_from_organization(uuid, uuid) to authenticated;

create or replace function public.owner_list_organization_members(
  target_organization_id uuid
)
returns table (
  membership_id uuid,
  organization_id uuid,
  organization_name text,
  user_profile_id uuid,
  auth_user_id uuid,
  email text,
  first_name text,
  last_name text,
  role text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if target_organization_id is null then
    raise exception 'organization_id is required';
  end if;

  if not public._is_platform_owner() then
    perform 1
    from public.organization_members om
    join public.user_profiles up on up.id = om.user_profile_id
    where up.auth_user_id = auth.uid()
      and om.organization_id = target_organization_id
      and om.status = 'active'
      and om.role in ('admin', 'organization_owner', 'director', 'owner')
    limit 1;
    if not found then
      raise exception 'Forbidden';
    end if;
  end if;

  return query
  select
    om.id as membership_id,
    om.organization_id,
    o.name as organization_name,
    om.user_profile_id,
    up.auth_user_id,
    up.email,
    up.first_name,
    up.last_name,
    om.role,
    om.status,
    om.created_at,
    om.updated_at
  from public.organization_members om
  join public.user_profiles up on up.id = om.user_profile_id
  join public.organizations o on o.id = om.organization_id
  where om.organization_id = target_organization_id
  order by om.created_at asc;
end;
$$;

revoke all on function public.owner_list_organization_members(uuid) from public;
grant execute on function public.owner_list_organization_members(uuid) to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public._ensure_user_profile_from_identity(
    new.id,
    lower(coalesce(new.email, '')),
    coalesce(new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'firstName', new.raw_user_meta_data ->> 'name', 'Пользователь'),
    coalesce(new.raw_user_meta_data ->> 'last_name', new.raw_user_meta_data ->> 'lastName', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    'pending'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
