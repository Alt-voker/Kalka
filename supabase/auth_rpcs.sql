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

create table if not exists public.legal_entities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  name text not null,
  inn text,
  kpp text,
  ogrn text,
  legal_address text,
  actual_address text,
  contact_name text,
  contact_phone text,
  contact_email text,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.legal_entities add column if not exists actual_address text;
alter table public.legal_entities add column if not exists contact_name text;
alter table public.legal_entities add column if not exists contact_phone text;
alter table public.legal_entities add column if not exists contact_email text;
alter table public.legal_entities add column if not exists status text default 'active';
alter table public.legal_entities add column if not exists created_at timestamptz default now();
alter table public.legal_entities add column if not exists updated_at timestamptz default now();

create index if not exists idx_legal_entities_organization_id on public.legal_entities(organization_id);
create index if not exists idx_legal_entities_status on public.legal_entities(status);
create index if not exists idx_legal_entities_inn on public.legal_entities(inn);

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
  );
$$;

revoke all on function public._is_platform_owner() from public;

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
  v_is_owner := exists(
    select 1
    from public.organization_members om
    where om.user_profile_id = v_profile.id
      and om.status = 'active'
      and om.role in ('platform_owner', 'owner')
  );

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
      and om.role in ('admin', 'organization_owner')
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

  if not public._is_platform_owner() and v_actor_role not in ('admin', 'organization_owner') then
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
    or (v_role = 'organization_owner' and public.current_user_can_access_organization(o.id))
    or (v_role = 'admin' and public.current_user_can_access_organization(o.id))
  )
    and (target_status is null or lower(o.status) = lower(target_status))
  group by o.id
  order by o.created_at asc;
end;
$$;

revoke all on function public.owner_list_organizations(text) from public;
grant execute on function public.owner_list_organizations(text) to authenticated;

create or replace function public.owner_get_organization_summary(
  target_organization_id uuid
)
returns table (
  organization_id uuid,
  members_count integer,
  active_members_count integer,
  legal_entities_count integer,
  suppliers_count integer,
  price_lists_count integer,
  orders_count integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_is_owner boolean := public._is_platform_owner();
  v_has_suppliers boolean := to_regclass('public.suppliers') is not null
    and exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'suppliers'
        and c.column_name = 'organization_id'
    );
  v_has_supplier_status boolean := exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'suppliers'
        and c.column_name = 'status'
    );
  v_has_price_lists boolean := to_regclass('public.price_lists') is not null
    and exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'price_lists'
        and c.column_name = 'organization_id'
    );
  v_has_price_list_status boolean := exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'price_lists'
        and c.column_name = 'status'
    );
  v_has_orders boolean := to_regclass('public.orders') is not null
    and exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'orders'
        and c.column_name = 'organization_id'
    );
  v_has_order_status boolean := exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'orders'
        and c.column_name = 'status'
    );
  v_has_legal_entities boolean := to_regclass('public.legal_entities') is not null
    and exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'legal_entities'
        and c.column_name = 'organization_id'
    );
  v_has_legal_entities_status boolean := exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'legal_entities'
        and c.column_name = 'status'
    );
  v_members_count integer := 0;
  v_active_members_count integer := 0;
  v_legal_entities_count integer := 0;
  v_suppliers_count integer := 0;
  v_price_lists_count integer := 0;
  v_orders_count integer := 0;
begin
  if target_organization_id is null then
    raise exception 'organization_id is required';
  end if;
  if auth.uid() is null then
    raise exception 'auth.uid() is required';
  end if;

  if not v_is_owner and not public.current_user_can_access_organization(target_organization_id) then
    raise exception 'Forbidden';
  end if;

  select count(*)::integer
    into v_members_count
  from public.organization_members om
  where om.organization_id = target_organization_id;

  select count(*)::integer
    into v_active_members_count
  from public.organization_members om
  where om.organization_id = target_organization_id
    and om.status = 'active';

  if v_has_suppliers then
    execute format(
      'select count(*)::integer from public.suppliers s where s.organization_id = $1'
      || case when v_has_supplier_status then ' and coalesce(s.status, ''active'') <> ''deleted''' else '' end
    )
      into v_suppliers_count
      using target_organization_id;
  end if;

  if v_has_price_lists then
    execute format(
      'select count(*)::integer from public.price_lists pl where pl.organization_id = $1'
      || case when v_has_price_list_status then ' and coalesce(pl.status, ''active'') <> ''deleted''' else '' end
    )
      into v_price_lists_count
      using target_organization_id;
  end if;

  if v_has_orders then
    execute format(
      'select count(*)::integer from public.orders o where o.organization_id = $1'
      || case when v_has_order_status then ' and coalesce(o.status, ''active'') <> ''deleted''' else '' end
    )
      into v_orders_count
      using target_organization_id;
  end if;

  if v_has_legal_entities then
    execute format(
      'select count(*)::integer from public.legal_entities le where le.organization_id = $1'
      || case when v_has_legal_entities_status then ' and coalesce(le.status, ''active'') = ''active''' else '' end
    )
      into v_legal_entities_count
      using target_organization_id;
  end if;

  return query
  select
    target_organization_id as organization_id,
    v_members_count as members_count,
    v_active_members_count as active_members_count,
    v_legal_entities_count as legal_entities_count,
    v_suppliers_count as suppliers_count,
    v_price_lists_count as price_lists_count,
    v_orders_count as orders_count,
    now() as updated_at;
end;
$$;

revoke all on function public.owner_get_organization_summary(uuid) from public;
grant execute on function public.owner_get_organization_summary(uuid) to authenticated;
notify pgrst, 'reload schema';

create or replace function public.owner_list_legal_entities(
  target_organization_id uuid
)
returns table (
  id uuid,
  organization_id uuid,
  name text,
  inn text,
  kpp text,
  ogrn text,
  legal_address text,
  actual_address text,
  contact_name text,
  contact_phone text,
  contact_email text,
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
  if auth.uid() is null then
    raise exception 'auth.uid() is required';
  end if;
  if not public.has_permission(target_organization_id, 'organization.view')
     and not public.has_permission(target_organization_id, 'organization.edit') then
    raise exception 'Forbidden';
  end if;

  return query
  select
    le.id,
    le.organization_id,
    le.name,
    le.inn,
    le.kpp,
    le.ogrn,
    coalesce(le.legal_address, '') as legal_address,
    coalesce(le.actual_address, '') as actual_address,
    coalesce(le.contact_name, '') as contact_name,
    coalesce(le.contact_phone, '') as contact_phone,
    coalesce(le.contact_email, '') as contact_email,
    coalesce(le.status, 'active') as status,
    le.created_at,
    le.updated_at
  from public.legal_entities le
  where le.organization_id = target_organization_id
    and coalesce(le.status, 'active') <> 'deleted'
  order by case when coalesce(le.status, 'active') = 'active' then 0 else 1 end, le.created_at asc;
end;
$$;

revoke all on function public.owner_list_legal_entities(uuid) from public;
grant execute on function public.owner_list_legal_entities(uuid) to authenticated;

create or replace function public.owner_create_legal_entity(
  target_organization_id uuid,
  target_name text,
  target_inn text default null,
  target_kpp text default null,
  target_ogrn text default null,
  target_legal_address text default null,
  target_actual_address text default null,
  target_contact_name text default null,
  target_contact_phone text default null,
  target_contact_email text default null,
  target_status text default 'active'
)
returns table (
  id uuid,
  organization_id uuid,
  name text,
  inn text,
  kpp text,
  ogrn text,
  legal_address text,
  actual_address text,
  contact_name text,
  contact_phone text,
  contact_email text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_row public.legal_entities%rowtype;
begin
  if target_organization_id is null then
    raise exception 'organization_id is required';
  end if;
  if auth.uid() is null then
    raise exception 'auth.uid() is required';
  end if;
  if not public.has_permission(target_organization_id, 'organization.edit') then
    raise exception 'Forbidden';
  end if;
  if coalesce(nullif(trim(target_name), ''), '') = '' then
    raise exception 'name is required';
  end if;

  insert into public.legal_entities (
    organization_id,
    name,
    inn,
    kpp,
    ogrn,
    legal_address,
    actual_address,
    contact_name,
    contact_phone,
    contact_email,
    status
  ) values (
    target_organization_id,
    trim(target_name),
    nullif(trim(target_inn), ''),
    nullif(trim(target_kpp), ''),
    nullif(trim(target_ogrn), ''),
    nullif(trim(target_legal_address), ''),
    nullif(trim(target_actual_address), ''),
    nullif(trim(target_contact_name), ''),
    nullif(trim(target_contact_phone), ''),
    nullif(trim(target_contact_email), ''),
    coalesce(nullif(lower(trim(coalesce(target_status, 'active'))), ''), 'active')
  )
  returning * into v_row;

  return query
  select
    v_row.id,
    v_row.organization_id,
    v_row.name,
    v_row.inn,
    v_row.kpp,
    v_row.ogrn,
    coalesce(v_row.legal_address, ''),
    coalesce(v_row.actual_address, ''),
    coalesce(v_row.contact_name, ''),
    coalesce(v_row.contact_phone, ''),
    coalesce(v_row.contact_email, ''),
    coalesce(v_row.status, 'active'),
    v_row.created_at,
    v_row.updated_at;
end;
$$;

revoke all on function public.owner_create_legal_entity(uuid, text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.owner_create_legal_entity(uuid, text, text, text, text, text, text, text, text, text, text) to authenticated;

create or replace function public.owner_update_legal_entity(
  target_legal_entity_id uuid,
  target_organization_id uuid,
  target_name text,
  target_inn text default null,
  target_kpp text default null,
  target_ogrn text default null,
  target_legal_address text default null,
  target_actual_address text default null,
  target_contact_name text default null,
  target_contact_phone text default null,
  target_contact_email text default null,
  target_status text default null
)
returns table (
  id uuid,
  organization_id uuid,
  name text,
  inn text,
  kpp text,
  ogrn text,
  legal_address text,
  actual_address text,
  contact_name text,
  contact_phone text,
  contact_email text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_row public.legal_entities%rowtype;
begin
  if target_legal_entity_id is null then
    raise exception 'legal_entity_id is required';
  end if;
  if target_organization_id is null then
    raise exception 'organization_id is required';
  end if;
  if auth.uid() is null then
    raise exception 'auth.uid() is required';
  end if;
  if not public.has_permission(target_organization_id, 'organization.edit') then
    raise exception 'Forbidden';
  end if;

  update public.legal_entities le
     set name = coalesce(nullif(trim(target_name), ''), le.name),
         inn = coalesce(nullif(trim(target_inn), ''), le.inn),
         kpp = coalesce(nullif(trim(target_kpp), ''), le.kpp),
         ogrn = coalesce(nullif(trim(target_ogrn), ''), le.ogrn),
         legal_address = coalesce(nullif(trim(target_legal_address), ''), le.legal_address),
         actual_address = coalesce(nullif(trim(target_actual_address), ''), le.actual_address),
         contact_name = coalesce(nullif(trim(target_contact_name), ''), le.contact_name),
         contact_phone = coalesce(nullif(trim(target_contact_phone), ''), le.contact_phone),
         contact_email = coalesce(nullif(trim(target_contact_email), ''), le.contact_email),
         status = coalesce(nullif(lower(trim(coalesce(target_status, ''))), ''), le.status),
         updated_at = now()
   where le.id = target_legal_entity_id
     and le.organization_id = target_organization_id
   returning * into v_row;

  if not found then
    raise exception 'legal_entity not found';
  end if;

  return query
  select
    v_row.id,
    v_row.organization_id,
    v_row.name,
    v_row.inn,
    v_row.kpp,
    v_row.ogrn,
    coalesce(v_row.legal_address, ''),
    coalesce(v_row.actual_address, ''),
    coalesce(v_row.contact_name, ''),
    coalesce(v_row.contact_phone, ''),
    coalesce(v_row.contact_email, ''),
    coalesce(v_row.status, 'active'),
    v_row.created_at,
    v_row.updated_at;
end;
$$;

revoke all on function public.owner_update_legal_entity(uuid, uuid, text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.owner_update_legal_entity(uuid, uuid, text, text, text, text, text, text, text, text, text, text) to authenticated;

create or replace function public.owner_archive_legal_entity(
  target_legal_entity_id uuid,
  target_organization_id uuid
)
returns table (
  id uuid,
  organization_id uuid,
  name text,
  inn text,
  kpp text,
  ogrn text,
  legal_address text,
  actual_address text,
  contact_name text,
  contact_phone text,
  contact_email text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  return query
  select * from public.owner_update_legal_entity(
    target_legal_entity_id,
    target_organization_id,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    'archived'
  );
end;
$$;

revoke all on function public.owner_archive_legal_entity(uuid, uuid) from public;
grant execute on function public.owner_archive_legal_entity(uuid, uuid) to authenticated;

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

  if not public._is_platform_owner() and v_role not in ('admin', 'organization_owner') then
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

  if not public._is_platform_owner() and v_actor_role not in ('admin', 'organization_owner') then
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

  if not public._is_platform_owner() and v_actor_role not in ('admin', 'organization_owner') then
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

  if not public._is_platform_owner() and v_actor_role not in ('admin', 'organization_owner') then
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
      and om.role in ('admin', 'organization_owner')
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

notify pgrst, 'reload schema';
