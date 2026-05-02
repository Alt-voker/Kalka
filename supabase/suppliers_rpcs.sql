create table if not exists public.supplier_legal_entities (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  legal_entity_id uuid not null references public.legal_entities(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supplier_legal_entities_unique unique (supplier_id, legal_entity_id)
);

create index if not exists idx_supplier_legal_entities_supplier_id on public.supplier_legal_entities(supplier_id);
create index if not exists idx_supplier_legal_entities_legal_entity_id on public.supplier_legal_entities(legal_entity_id);
create index if not exists idx_supplier_legal_entities_org_id on public.supplier_legal_entities(organization_id);
create index if not exists idx_supplier_legal_entities_status on public.supplier_legal_entities(status);

alter table if exists public.suppliers add column if not exists contact_name text not null default '';

create index if not exists idx_suppliers_org_id on public.suppliers(organization_id);
create index if not exists idx_suppliers_status on public.suppliers(status);
create index if not exists idx_suppliers_inn on public.suppliers(inn);

create or replace function public.owner_list_suppliers(target_organization_id uuid)
returns table (
  id uuid,
  organization_id uuid,
  name text,
  inn text,
  phone text,
  email text,
  contact_name text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  emoji text,
  kind text,
  rating numeric,
  orders_count integer,
  delivery text,
  min_order_text text,
  tags text[],
  hidden boolean,
  legacy_key text,
  legal_entity_ids uuid[],
  legal_entity_names text[],
  comment text
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if target_organization_id is null then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if not public.has_permission(target_organization_id, 'suppliers.view') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  return query
  select
    s.id,
    s.organization_id,
    s.name,
    coalesce(s.inn, '') as inn,
    coalesce(s.phone, '') as phone,
    coalesce(s.email, '') as email,
    coalesce(nullif(s.contact_name, ''), nullif(s.contact_person, ''), '') as contact_name,
    coalesce(s.status, 'active') as status,
    s.created_at,
    s.updated_at,
    ''::text as emoji,
    'Поставщик'::text as kind,
    0::numeric as rating,
    0::integer as orders_count,
    ''::text as delivery,
    ''::text as min_order_text,
    '{}'::text[] as tags,
    false as hidden,
    ''::text as legacy_key,
    coalesce(array_agg(distinct le.id) filter (where le.id is not null), '{}'::uuid[]) as legal_entity_ids,
    coalesce(array_agg(distinct le.name) filter (where le.id is not null), '{}'::text[]) as legal_entity_names,
    coalesce(max(s.comment), '') as comment
  from public.suppliers s
  left join public.supplier_legal_entities sle
    on sle.supplier_id = s.id
   and sle.organization_id = target_organization_id
   and sle.status = 'active'
  left join public.legal_entities le
    on le.id = sle.legal_entity_id
   and le.organization_id = target_organization_id
   and le.status = 'active'
  where s.organization_id = target_organization_id
  group by
    s.id, s.organization_id, s.name, s.inn, s.phone, s.email,
    s.contact_name, s.contact_person, s.status, s.created_at, s.updated_at, s.comment
  order by s.name asc, s.created_at desc;
end;
$$;

create or replace function public.owner_create_supplier(
  target_organization_id uuid,
  target_name text,
  target_inn text default '',
  target_phone text default '',
  target_email text default '',
  target_contact_name text default '',
  target_status text default 'active',
  target_legal_entity_ids uuid[] default '{}'::uuid[]
)
returns table (
  id uuid,
  organization_id uuid,
  name text,
  inn text,
  phone text,
  email text,
  contact_name text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  emoji text,
  kind text,
  rating numeric,
  orders_count integer,
  delivery text,
  min_order_text text,
  tags text[],
  hidden boolean,
  legacy_key text,
  legal_entity_ids uuid[],
  legal_entity_names text[],
  comment text
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_supplier_id uuid;
  v_status text := coalesce(nullif(lower(trim(target_status)), ''), 'active');
begin
  if target_organization_id is null then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if not public.has_permission(target_organization_id, 'suppliers.create') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if coalesce(trim(target_name), '') = '' then
    raise exception 'Название поставщика обязательно' using errcode = '22023';
  end if;
  insert into public.suppliers (
    organization_id,
    name,
    inn,
    phone,
    email,
    contact_name,
    contact_person,
    status,
    updated_at
  )
  values (
    target_organization_id,
    trim(target_name),
    coalesce(trim(target_inn), ''),
    coalesce(trim(target_phone), ''),
    coalesce(trim(target_email), ''),
    coalesce(trim(target_contact_name), ''),
    coalesce(trim(target_contact_name), ''),
    case when v_status in ('active', 'inactive', 'archived') then v_status else 'active' end,
    now()
  )
  returning id into v_supplier_id;

  if coalesce(array_length(target_legal_entity_ids, 1), 0) > 0 then
    insert into public.supplier_legal_entities (
      supplier_id,
      legal_entity_id,
      organization_id,
      status,
      updated_at
    )
    select
      v_supplier_id,
      le.id,
      target_organization_id,
      'active',
      now()
    from public.legal_entities le
    where le.organization_id = target_organization_id
      and le.status = 'active'
      and le.id = any(target_legal_entity_ids)
    on conflict (supplier_id, legal_entity_id)
    do update set
      organization_id = excluded.organization_id,
      status = 'active',
      updated_at = now();
  end if;

  return query
  select * from public.owner_list_suppliers(target_organization_id)
  where id = v_supplier_id;
end;
$$;

create or replace function public.owner_update_supplier(
  target_supplier_id uuid,
  target_organization_id uuid,
  target_name text,
  target_inn text default '',
  target_phone text default '',
  target_email text default '',
  target_contact_name text default '',
  target_status text default 'active',
  target_legal_entity_ids uuid[] default '{}'::uuid[]
)
returns table (
  id uuid,
  organization_id uuid,
  name text,
  inn text,
  phone text,
  email text,
  contact_name text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  emoji text,
  kind text,
  rating numeric,
  orders_count integer,
  delivery text,
  min_order_text text,
  tags text[],
  hidden boolean,
  legacy_key text,
  legal_entity_ids uuid[],
  legal_entity_names text[],
  comment text
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_org_id uuid;
  v_status text := coalesce(nullif(lower(trim(target_status)), ''), 'active');
begin
  if target_supplier_id is null then
    raise exception 'Поставщик не найден' using errcode = '22023';
  end if;
  select s.organization_id into v_org_id
  from public.suppliers s
  where s.id = target_supplier_id
  limit 1;
  if v_org_id is null and target_organization_id is not null then
    v_org_id := target_organization_id;
    update public.suppliers
       set organization_id = v_org_id,
           updated_at = now()
     where id = target_supplier_id
       and organization_id is null;
  end if;
  if v_org_id is null then
    raise exception 'Поставщик не найден' using errcode = '22023';
  end if;
  if target_organization_id is not null and target_organization_id <> v_org_id then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if not public.has_permission(v_org_id, 'suppliers.edit') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if coalesce(trim(target_name), '') = '' then
    raise exception 'Название поставщика обязательно' using errcode = '22023';
  end if;

  update public.suppliers s
     set name = trim(target_name),
         inn = coalesce(trim(target_inn), ''),
         phone = coalesce(trim(target_phone), ''),
         email = coalesce(trim(target_email), ''),
         contact_name = coalesce(trim(target_contact_name), ''),
         contact_person = coalesce(trim(target_contact_name), ''),
         status = case when v_status in ('active', 'inactive', 'archived') then v_status else s.status end,
         updated_at = now()
   where s.id = target_supplier_id
     and s.organization_id = v_org_id;

  delete from public.supplier_legal_entities sle
   where sle.supplier_id = target_supplier_id
     and sle.organization_id = v_org_id;

  if coalesce(array_length(target_legal_entity_ids, 1), 0) > 0 then
    insert into public.supplier_legal_entities (
      supplier_id,
      legal_entity_id,
      organization_id,
      status,
      updated_at
    )
    select
      target_supplier_id,
      le.id,
      v_org_id,
      'active',
      now()
    from public.legal_entities le
    where le.organization_id = v_org_id
      and le.status = 'active'
      and le.id = any(target_legal_entity_ids)
    on conflict (supplier_id, legal_entity_id)
    do update set
      organization_id = excluded.organization_id,
      status = 'active',
      updated_at = now();
  end if;

  return query
  select * from public.owner_list_suppliers(v_org_id)
  where id = target_supplier_id;
end;
$$;

create or replace function public.owner_archive_supplier(
  target_supplier_id uuid,
  target_organization_id uuid default null
)
returns table (
  id uuid,
  organization_id uuid,
  name text,
  inn text,
  phone text,
  email text,
  contact_name text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  emoji text,
  kind text,
  rating numeric,
  orders_count integer,
  delivery text,
  min_order_text text,
  tags text[],
  hidden boolean,
  legacy_key text,
  legal_entity_ids uuid[],
  legal_entity_names text[],
  comment text
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_org_id uuid;
begin
  select s.organization_id into v_org_id
  from public.suppliers s
  where s.id = target_supplier_id
  limit 1;
  if v_org_id is null and target_organization_id is not null then
    v_org_id := target_organization_id;
    update public.suppliers s
       set organization_id = v_org_id,
           updated_at = now()
     where s.id = target_supplier_id
       and organization_id is null;
  end if;
  if v_org_id is null then
    raise exception 'Поставщик не найден' using errcode = '22023';
  end if;
  if not public.has_permission(v_org_id, 'suppliers.delete') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  update public.suppliers s
     set status = 'archived',
         updated_at = now()
   where s.id = target_supplier_id
     and organization_id = v_org_id;
  return query
  select * from public.owner_list_suppliers(v_org_id) s
  where s.id = target_supplier_id;
end;
$$;

create or replace function public.owner_delete_supplier(
  target_supplier_id uuid,
  target_organization_id uuid default null
)
returns table (
  id uuid,
  organization_id uuid,
  name text,
  inn text,
  phone text,
  email text,
  contact_name text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  emoji text,
  kind text,
  rating numeric,
  orders_count integer,
  delivery text,
  min_order_text text,
  tags text[],
  hidden boolean,
  legacy_key text,
  legal_entity_ids uuid[],
  legal_entity_names text[],
  comment text
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_org_id uuid;
begin
  select s.organization_id into v_org_id
  from public.suppliers s
  where s.id = target_supplier_id
  limit 1;
  if v_org_id is null and target_organization_id is not null then
    v_org_id := target_organization_id;
    update public.suppliers s
       set organization_id = v_org_id,
           updated_at = now()
     where s.id = target_supplier_id
       and organization_id is null;
  end if;
  if v_org_id is null then
    raise exception 'Поставщик не найден' using errcode = '22023';
  end if;
  if not public.has_permission(v_org_id, 'suppliers.delete') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  update public.suppliers s
     set status = 'deleted',
         updated_at = now()
   where s.id = target_supplier_id
     and organization_id = v_org_id;
  return query
  select * from public.owner_list_suppliers(v_org_id) s
  where s.id = target_supplier_id;
end;
$$;

create or replace function public.owner_link_supplier_legal_entities(
  target_supplier_id uuid,
  target_legal_entity_ids uuid[] default '{}'::uuid[],
  target_organization_id uuid default null
)
returns table (
  id uuid,
  organization_id uuid,
  name text,
  inn text,
  phone text,
  email text,
  contact_name text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  emoji text,
  kind text,
  rating numeric,
  orders_count integer,
  delivery text,
  min_order_text text,
  tags text[],
  hidden boolean,
  legacy_key text,
  legal_entity_ids uuid[],
  legal_entity_names text[],
  comment text
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_org_id uuid;
begin
  select s.organization_id into v_org_id
  from public.suppliers s
  where s.id = target_supplier_id
  limit 1;
  if v_org_id is null and target_organization_id is not null then
    v_org_id := target_organization_id;
    update public.suppliers
       set organization_id = v_org_id,
           updated_at = now()
     where id = target_supplier_id
       and organization_id is null;
  end if;
  if v_org_id is null then
    raise exception 'Поставщик не найден' using errcode = '22023';
  end if;
  if not public.has_permission(v_org_id, 'suppliers.edit') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  delete from public.supplier_legal_entities sle
   where sle.supplier_id = target_supplier_id
     and sle.organization_id = v_org_id;

  if coalesce(array_length(target_legal_entity_ids, 1), 0) > 0 then
    insert into public.supplier_legal_entities (
      supplier_id,
      legal_entity_id,
      organization_id,
      status,
      updated_at
    )
    select
      target_supplier_id,
      le.id,
      v_org_id,
      'active',
      now()
    from public.legal_entities le
    where le.organization_id = v_org_id
      and le.status = 'active'
      and le.id = any(target_legal_entity_ids)
    on conflict (supplier_id, legal_entity_id)
    do update set
      organization_id = excluded.organization_id,
      status = 'active',
      updated_at = now();
  end if;

  return query
  select * from public.owner_list_suppliers(v_org_id)
  where id = target_supplier_id;
end;
$$;

revoke all on function public.owner_list_suppliers(uuid) from public;
revoke all on function public.owner_create_supplier(uuid, text, text, text, text, text, text, uuid[]) from public;
revoke all on function public.owner_update_supplier(uuid, uuid, text, text, text, text, text, text, uuid[]) from public;
revoke all on function public.owner_archive_supplier(uuid, uuid) from public;
revoke all on function public.owner_delete_supplier(uuid, uuid) from public;
revoke all on function public.owner_link_supplier_legal_entities(uuid, uuid[], uuid) from public;

grant execute on function public.owner_list_suppliers(uuid) to authenticated;
grant execute on function public.owner_create_supplier(uuid, text, text, text, text, text, text, uuid[]) to authenticated;
grant execute on function public.owner_update_supplier(uuid, uuid, text, text, text, text, text, text, uuid[]) to authenticated;
grant execute on function public.owner_archive_supplier(uuid, uuid) to authenticated;
grant execute on function public.owner_delete_supplier(uuid, uuid) to authenticated;
grant execute on function public.owner_link_supplier_legal_entities(uuid, uuid[], uuid) to authenticated;

notify pgrst, 'reload schema';
