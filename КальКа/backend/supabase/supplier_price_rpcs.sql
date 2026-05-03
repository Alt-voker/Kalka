begin;

create extension if not exists pgcrypto;

create table if not exists public.supplier_price_lists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  title text not null default '',
  name text not null default '',
  source_filename text not null default '',
  uploaded_by uuid references public.profiles(id) on delete set null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.supplier_price_lists
  add column if not exists title text not null default '',
  add column if not exists name text not null default '',
  add column if not exists source_filename text not null default '',
  add column if not exists uploaded_by uuid,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.supplier_price_list_legal_entities (
  id uuid primary key default gen_random_uuid(),
  price_list_id uuid not null references public.supplier_price_lists(id) on delete cascade,
  legal_entity_id uuid not null references public.legal_entities(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

alter table if exists public.supplier_price_list_legal_entities
  add column if not exists organization_id uuid,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.supplier_price_items (
  id uuid primary key default gen_random_uuid(),
  price_list_id uuid not null references public.supplier_price_lists(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  raw_name text not null default '',
  original_name text not null default '',
  normalized_name text not null default '',
  unit text,
  price numeric(14,2),
  currency text not null default 'RUB',
  raw_row jsonb,
  row_index integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.supplier_price_items
  add column if not exists organization_id uuid,
  add column if not exists supplier_id uuid,
  add column if not exists raw_name text not null default '',
  add column if not exists original_name text not null default '',
  add column if not exists normalized_name text not null default '',
  add column if not exists unit text,
  add column if not exists price numeric(14,2),
  add column if not exists currency text not null default 'RUB',
  add column if not exists raw_row jsonb,
  add column if not exists row_index integer not null default 0,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_supplier_price_lists_org_id on public.supplier_price_lists(organization_id);
create index if not exists idx_supplier_price_lists_supplier_id on public.supplier_price_lists(supplier_id);
create index if not exists idx_supplier_price_lists_status on public.supplier_price_lists(status);
create index if not exists idx_supplier_price_list_legals_price_list_id on public.supplier_price_list_legal_entities(price_list_id);
create index if not exists idx_supplier_price_list_legals_org_id on public.supplier_price_list_legal_entities(organization_id);
create index if not exists idx_supplier_price_items_price_list_id on public.supplier_price_items(price_list_id);
create index if not exists idx_supplier_price_items_org_id on public.supplier_price_items(organization_id);
create unique index if not exists supplier_price_items_price_list_row_idx on public.supplier_price_items(price_list_id, row_index);

drop trigger if exists trg_supplier_price_lists_touch_updated_at on public.supplier_price_lists;
create trigger trg_supplier_price_lists_touch_updated_at
before update on public.supplier_price_lists
for each row execute procedure public._touch_updated_at();

drop trigger if exists trg_supplier_price_items_touch_updated_at on public.supplier_price_items;
create trigger trg_supplier_price_items_touch_updated_at
before update on public.supplier_price_items
for each row execute procedure public._touch_updated_at();

create or replace function public.owner_list_supplier_price_lists(
  target_supplier_id uuid,
  target_organization_id uuid
)
returns table (
  id uuid,
  organization_id uuid,
  supplier_id uuid,
  title text,
  name text,
  source_filename text,
  uploaded_by uuid,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  item_count integer,
  legal_entity_ids uuid[],
  legal_entity_names text[]
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_org_id uuid;
begin
  select s.organization_id
    into v_org_id
  from public.suppliers s
  where s.id = target_supplier_id
  limit 1;

  if v_org_id is null then
    raise exception 'Поставщик не найден' using errcode = '22023';
  end if;

  if target_organization_id is not null and target_organization_id <> v_org_id then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if not public.has_permission(v_org_id, 'price_lists.view') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  with list_rows as (
    select
      spl.id,
      spl.organization_id,
      spl.supplier_id,
      coalesce(nullif(spl.title, ''), nullif(spl.name, ''), 'Прайс-лист') as title,
      coalesce(nullif(spl.name, ''), nullif(spl.title, ''), 'Прайс-лист') as name,
      coalesce(spl.source_filename, '') as source_filename,
      spl.uploaded_by,
      coalesce(spl.status, 'active') as status,
      spl.created_at,
      spl.updated_at
    from public.supplier_price_lists spl
    where spl.supplier_id = target_supplier_id
      and spl.organization_id = v_org_id
      and coalesce(spl.status, 'active') <> 'deleted'
  ),
  item_counts as (
    select spi.price_list_id, count(*)::integer as item_count
    from public.supplier_price_items spi
    where spi.organization_id = v_org_id
      and coalesce(spi.status, 'active') <> 'deleted'
    group by spi.price_list_id
  ),
  legal_ids as (
    select sple.price_list_id, array_agg(distinct le.id) as legal_entity_ids
    from public.supplier_price_list_legal_entities sple
    join public.legal_entities le
      on le.id = sple.legal_entity_id
     and le.organization_id = v_org_id
     and coalesce(le.status, 'active') <> 'deleted'
    where sple.organization_id = v_org_id
      and coalesce(sple.status, 'active') <> 'deleted'
    group by sple.price_list_id
  ),
  legal_names as (
    select sple.price_list_id, array_agg(distinct le.name) as legal_entity_names
    from public.supplier_price_list_legal_entities sple
    join public.legal_entities le
      on le.id = sple.legal_entity_id
     and le.organization_id = v_org_id
     and coalesce(le.status, 'active') <> 'deleted'
    where sple.organization_id = v_org_id
      and coalesce(sple.status, 'active') <> 'deleted'
    group by sple.price_list_id
  )
  select
    lr.id,
    lr.organization_id,
    lr.supplier_id,
    lr.title,
    lr.name,
    lr.source_filename,
    lr.uploaded_by,
    lr.status,
    lr.created_at,
    lr.updated_at,
    coalesce(ic.item_count, 0) as item_count,
    coalesce(li.legal_entity_ids, '{}'::uuid[]) as legal_entity_ids,
    coalesce(ln.legal_entity_names, '{}'::text[]) as legal_entity_names
  from list_rows lr
  left join item_counts ic on ic.price_list_id = lr.id
  left join legal_ids li on li.price_list_id = lr.id
  left join legal_names ln on ln.price_list_id = lr.id
  order by lr.created_at desc;
end;
$$;
create or replace function public.owner_create_supplier_price_list(
  target_organization_id uuid,
  target_supplier_id uuid,
  target_title text,
  target_source_filename text default '',
  target_uploaded_by uuid default null,
  target_legal_entity_ids uuid[] default '{}'::uuid[],
  target_status text default 'active'
)
returns table (
  id uuid,
  organization_id uuid,
  supplier_id uuid,
  title text,
  name text,
  source_filename text,
  uploaded_by uuid,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  item_count integer,
  legal_entity_ids uuid[],
  legal_entity_names text[]
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_org_id uuid;
  v_new_id uuid;
  v_new_row public.supplier_price_lists%rowtype;
begin
  select s.organization_id into v_org_id
  from public.suppliers s
  where s.id = target_supplier_id
  limit 1;
  if v_org_id is null then
    raise exception 'Поставщик не найден' using errcode = '22023';
  end if;
  if target_organization_id is not null and target_organization_id <> v_org_id then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if not public.has_permission(v_org_id, 'price_lists.upload') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if coalesce(trim(target_title), '') = '' then
    raise exception 'Название прайса обязательно' using errcode = '22023';
  end if;
  with inserted_price_list as (
    insert into public.supplier_price_lists (
      organization_id,
      supplier_id,
      title,
      name,
      source_filename,
      uploaded_by,
      status,
      created_at,
      updated_at
    )
    values (
      v_org_id,
      target_supplier_id,
      trim(target_title),
      trim(target_title),
      coalesce(trim(target_source_filename), ''),
      target_uploaded_by,
      case when coalesce(lower(trim(target_status)), 'active') in ('active','archived','inactive') then lower(trim(target_status)) else 'active' end,
      now(),
      now()
    )
    returning public.supplier_price_lists.id
  )
  select inserted_price_list.id
    into v_new_id
  from inserted_price_list;

  if coalesce(array_length(target_legal_entity_ids, 1), 0) > 0 then
    insert into public.supplier_price_list_legal_entities (
      price_list_id,
      legal_entity_id,
      organization_id,
      status,
      created_at
    )
    select
      v_new_id,
      le.id,
      v_org_id,
      'active',
      now()
    from public.legal_entities le
    where le.organization_id = v_org_id
      and coalesce(le.status, 'active') <> 'deleted'
      and le.id = any(target_legal_entity_ids)
    on conflict (price_list_id, legal_entity_id)
    do update set
      organization_id = excluded.organization_id,
      status = 'active';
  end if;

  select
    spl.id,
    spl.organization_id,
    spl.supplier_id,
    coalesce(nullif(spl.title, ''), nullif(spl.name, ''), 'Прайс-лист') as title,
    coalesce(nullif(spl.name, ''), nullif(spl.title, ''), 'Прайс-лист') as name,
    coalesce(spl.source_filename, '') as source_filename,
    spl.uploaded_by,
    coalesce(spl.status, 'active') as status,
    spl.created_at,
    spl.updated_at,
    coalesce((
      select count(*)::integer
      from public.supplier_price_items spi
      where spi.price_list_id = spl.id
        and coalesce(spi.status, 'active') <> 'deleted'
    ), 0) as item_count,
    coalesce((
      select array_agg(distinct le.id)
      from public.supplier_price_list_legal_entities sple
      join public.legal_entities le
        on le.id = sple.legal_entity_id
       and le.organization_id = v_org_id
       and coalesce(le.status, 'active') <> 'deleted'
      where sple.price_list_id = spl.id
        and sple.organization_id = v_org_id
        and coalesce(sple.status, 'active') <> 'deleted'
    ), '{}'::uuid[]) as legal_entity_ids,
    coalesce((
      select array_agg(distinct le.name)
      from public.supplier_price_list_legal_entities sple
      join public.legal_entities le
        on le.id = sple.legal_entity_id
       and le.organization_id = v_org_id
       and coalesce(le.status, 'active') <> 'deleted'
      where sple.price_list_id = spl.id
        and sple.organization_id = v_org_id
        and coalesce(sple.status, 'active') <> 'deleted'
    ), '{}'::text[]) as legal_entity_names
  into v_new_row
  from public.supplier_price_lists spl
  where spl.id = v_new_id
    and spl.organization_id = v_org_id
    and coalesce(spl.status, 'active') <> 'deleted';

  return query
  select
    v_new_row.id,
    v_new_row.organization_id,
    v_new_row.supplier_id,
    v_new_row.title,
    v_new_row.name,
    v_new_row.source_filename,
    v_new_row.uploaded_by,
    v_new_row.status,
    v_new_row.created_at,
    v_new_row.updated_at,
    v_new_row.item_count,
    v_new_row.legal_entity_ids,
    v_new_row.legal_entity_names;
end;
$$;

create or replace function public.owner_archive_supplier_price_list(
  target_price_list_id uuid,
  target_organization_id uuid default null
)
returns table (
  id uuid,
  organization_id uuid,
  supplier_id uuid,
  title text,
  name text,
  source_filename text,
  uploaded_by uuid,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  item_count integer,
  legal_entity_ids uuid[],
  legal_entity_names text[]
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_org_id uuid;
begin
  select spl.organization_id into v_org_id
  from public.supplier_price_lists spl
  where spl.id = target_price_list_id
  limit 1;
  if v_org_id is null then
    raise exception 'Прайс-лист не найден' using errcode = '22023';
  end if;
  if target_organization_id is not null and target_organization_id <> v_org_id then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if not public.has_permission(v_org_id, 'price_lists.delete') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  update public.supplier_price_lists spl
     set status = 'archived',
         updated_at = now()
   where spl.id = target_price_list_id
     and spl.organization_id = v_org_id;
  return query
  select
    spl.id,
    spl.organization_id,
    spl.supplier_id,
    coalesce(nullif(spl.title, ''), nullif(spl.name, ''), 'Прайс-лист') as title,
    coalesce(nullif(spl.name, ''), nullif(spl.title, ''), 'Прайс-лист') as name,
    coalesce(spl.source_filename, '') as source_filename,
    spl.uploaded_by,
    coalesce(spl.status, 'active') as status,
    spl.created_at,
    spl.updated_at,
    coalesce((
      select count(*)::integer
      from public.supplier_price_items spi
      where spi.price_list_id = spl.id
        and coalesce(spi.status, 'active') <> 'deleted'
    ), 0) as item_count,
    coalesce(array_agg(distinct le.id) filter (where le.id is not null), '{}'::uuid[]) as legal_entity_ids,
    coalesce(array_agg(distinct le.name) filter (where le.id is not null), '{}'::text[]) as legal_entity_names
  from public.supplier_price_lists spl
  left join public.supplier_price_list_legal_entities sple
    on sple.price_list_id = spl.id
   and sple.organization_id = v_org_id
   and coalesce(sple.status, 'active') <> 'deleted'
  left join public.legal_entities le
    on le.id = sple.legal_entity_id
   and le.organization_id = v_org_id
   and coalesce(le.status, 'active') <> 'deleted'
  where spl.id = target_price_list_id
    and spl.organization_id = v_org_id
    and coalesce(spl.status, 'active') <> 'deleted'
  group by spl.id, spl.organization_id, spl.supplier_id, spl.title, spl.name, spl.source_filename, spl.uploaded_by, spl.status, spl.created_at, spl.updated_at;
end;
$$;

create or replace function public.owner_delete_supplier_price_list(
  target_price_list_id uuid,
  target_organization_id uuid default null
)
returns table (
  deleted_id uuid,
  price_list_id uuid,
  organization_id uuid,
  supplier_id uuid,
  removed_items_count integer,
  removed_legal_entities_count integer
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_org_id uuid;
  v_supplier_id uuid;
  v_removed_items integer := 0;
  v_removed_legals integer := 0;
begin
  select spl.organization_id, spl.supplier_id
    into v_org_id, v_supplier_id
  from public.supplier_price_lists spl
  where spl.id = target_price_list_id
  limit 1;

  if v_org_id is null then
    raise exception 'Прайс-лист не найден' using errcode = '22023';
  end if;

  if target_organization_id is not null and target_organization_id <> v_org_id then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if not public.has_permission(v_org_id, 'price_lists.delete') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  delete from public.supplier_price_items spi
   where spi.price_list_id = target_price_list_id
     and spi.organization_id = v_org_id;
  get diagnostics v_removed_items = row_count;

  delete from public.supplier_price_list_legal_entities sple
   where sple.price_list_id = target_price_list_id
     and sple.organization_id = v_org_id;
  get diagnostics v_removed_legals = row_count;

  delete from public.supplier_price_lists spl
   where spl.id = target_price_list_id
     and spl.organization_id = v_org_id;

  return query
  select
    target_price_list_id as deleted_id,
    target_price_list_id as price_list_id,
    v_org_id as organization_id,
    v_supplier_id as supplier_id,
    v_removed_items as removed_items_count,
    v_removed_legals as removed_legal_entities_count;
end;
$$;

create or replace function public.owner_list_supplier_price_items(
  target_price_list_id uuid,
  target_organization_id uuid
)
returns table (
  id uuid,
  price_list_id uuid,
  organization_id uuid,
  supplier_id uuid,
  raw_name text,
  normalized_name text,
  unit text,
  price numeric,
  currency text,
  raw_row jsonb,
  row_index integer,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_org_id uuid;
begin
  select spl.organization_id into v_org_id
  from public.supplier_price_lists spl
  where spl.id = target_price_list_id
  limit 1;
  if v_org_id is null then
    raise exception 'Прайс-лист не найден' using errcode = '22023';
  end if;
  if target_organization_id is not null and target_organization_id <> v_org_id then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if not public.has_permission(v_org_id, 'price_lists.view') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  return query
  select
    spi.id,
    spi.price_list_id,
    spi.organization_id,
    spi.supplier_id,
    coalesce(nullif(spi.raw_name, ''), '') as raw_name,
    coalesce(nullif(spi.normalized_name, ''), lower(coalesce(nullif(spi.raw_name, ''), ''))) as normalized_name,
    spi.unit,
    spi.price,
    coalesce(spi.currency, 'RUB') as currency,
    spi.raw_row,
    spi.row_index,
    coalesce(spi.status, 'active') as status,
    spi.created_at,
    spi.updated_at
  from public.supplier_price_items spi
  where spi.price_list_id = target_price_list_id
    and spi.organization_id = v_org_id
    and coalesce(spi.status, 'active') <> 'deleted'
  order by spi.row_index asc, spi.created_at asc;
end;
$$;

create or replace function public.owner_import_supplier_price_items(
  target_price_list_id uuid,
  target_items jsonb,
  target_organization_id uuid default null
)
returns table (
  id uuid,
  price_list_id uuid,
  organization_id uuid,
  supplier_id uuid,
  raw_name text,
  normalized_name text,
  unit text,
  price numeric,
  currency text,
  raw_row jsonb,
  row_index integer,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_org_id uuid;
  v_supplier_id uuid;
begin
  select spl.organization_id, spl.supplier_id
    into v_org_id, v_supplier_id
  from public.supplier_price_lists spl
  where spl.id = target_price_list_id
  limit 1;

  if v_org_id is null then
    raise exception 'Прайс-лист не найден' using errcode = '22023';
  end if;

  if target_organization_id is not null and target_organization_id <> v_org_id then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if not public.has_permission(v_org_id, 'price_lists.upload') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  with incoming as (
    select
      row_number() over (order by src.row_index, src.raw_name) as rn,
      nullif(trim(coalesce(src.raw_name, src.name, '')), '') as raw_name,
      nullif(trim(coalesce(src.normalized_name, src.raw_name, src.name, '')), '') as normalized_name,
      nullif(trim(coalesce(src.unit, '')), '') as unit,
      nullif(trim(coalesce(src.currency, 'RUB')), '') as currency,
      coalesce(src.raw_row, '{}'::jsonb) as raw_row,
      nullif(trim(coalesce(src.row_index::text, '')), '') as row_index_text,
      nullif(trim(coalesce(src.status, 'active')), '') as status_text,
      nullif(regexp_replace(coalesce(src.price::text, ''), '[^0-9,.-]', '', 'g'), '') as price_text
    from jsonb_to_recordset(coalesce(target_items, '[]'::jsonb)) as src(
      raw_name text,
      name text,
      normalized_name text,
      unit text,
      currency text,
      raw_row jsonb,
      row_index integer,
      status text,
      price text
    )
  ),
  filtered as (
    select
      incoming.rn,
      incoming.raw_name,
      incoming.normalized_name,
      incoming.unit,
      incoming.currency,
      incoming.raw_row,
      incoming.row_index_text,
      incoming.status_text,
      case
        when incoming.price_text is null or trim(incoming.price_text) = '' then null
        else replace(incoming.price_text, ',', '.')
      end as price_value
    from incoming
    where coalesce(incoming.raw_name, '') <> ''
      and incoming.price_text is not null
      and trim(incoming.price_text) <> ''
  ),
  inserted as (
    insert into public.supplier_price_items (
      price_list_id,
      organization_id,
      supplier_id,
      raw_name,
      original_name,
      normalized_name,
      unit,
      price,
      currency,
      raw_row,
      row_index,
      status,
      created_at,
      updated_at
    )
    select
      target_price_list_id,
      v_org_id,
      v_supplier_id,
      f.raw_name,
      f.raw_name as original_name,
      coalesce(f.normalized_name, lower(coalesce(f.raw_name, ''))) as normalized_name,
      f.unit,
      f.price_value::numeric,
      coalesce(f.currency, 'RUB') as currency,
      coalesce(f.raw_row, '{}'::jsonb) as raw_row,
      coalesce(nullif(f.row_index_text, '')::integer, f.rn::integer) as row_index,
      case
        when lower(coalesce(f.status_text, 'active')) in ('active', 'inactive', 'archived', 'deleted')
          then lower(coalesce(f.status_text, 'active'))
        else 'active'
      end as status,
      now(),
      now()
    from filtered f
    on conflict (price_list_id, row_index)
    do update set
      organization_id = excluded.organization_id,
      supplier_id = excluded.supplier_id,
      raw_name = excluded.raw_name,
      original_name = excluded.original_name,
      normalized_name = excluded.normalized_name,
      unit = excluded.unit,
      price = excluded.price,
      currency = excluded.currency,
      raw_row = excluded.raw_row,
      status = excluded.status,
      updated_at = now()
    returning public.supplier_price_items.*
  )
  select
    spi.id,
    spi.price_list_id,
    spi.organization_id,
    spi.supplier_id,
    spi.raw_name,
    spi.normalized_name,
    spi.unit,
    spi.price,
    spi.currency,
    spi.raw_row,
    spi.row_index,
    spi.status,
    spi.created_at,
    spi.updated_at
  from inserted spi;
end;
$$;
grant execute on function public.owner_list_supplier_price_lists(uuid, uuid) to authenticated;
grant execute on function public.owner_create_supplier_price_list(uuid, uuid, text, text, uuid, uuid[], text) to authenticated;
grant execute on function public.owner_archive_supplier_price_list(uuid, uuid) to authenticated;
grant execute on function public.owner_delete_supplier_price_list(uuid, uuid) to authenticated;
grant execute on function public.owner_list_supplier_price_items(uuid, uuid) to authenticated;
grant execute on function public.owner_import_supplier_price_items(uuid, jsonb, uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
