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

notify pgrst, 'reload schema';
