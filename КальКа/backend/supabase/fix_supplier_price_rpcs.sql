begin;

create extension if not exists pgcrypto;

alter table if exists public.supplier_price_items
  add column if not exists original_name text not null default '';

update public.supplier_price_items as spi
   set original_name = coalesce(nullif(spi.original_name, ''), nullif(spi.raw_name, ''), '')
 where spi.original_name is null
    or spi.original_name = '';

create unique index if not exists supplier_price_items_price_list_row_idx
  on public.supplier_price_items(price_list_id, row_index);

create unique index if not exists supplier_price_list_legal_entities_price_list_legal_idx
  on public.supplier_price_list_legal_entities(price_list_id, legal_entity_id);

drop function if exists public.owner_list_supplier_price_lists(uuid, uuid);
drop function if exists public.owner_create_supplier_price_list(uuid, uuid, text, text, uuid, uuid[], text);
drop function if exists public.owner_archive_supplier_price_list(uuid, uuid);
drop function if exists public.owner_delete_supplier_price_list(uuid, uuid);
drop function if exists public.owner_list_supplier_price_items(uuid, uuid);
drop function if exists public.owner_import_supplier_price_items(uuid, jsonb, uuid);

create or replace function public.owner_list_supplier_price_lists(
  p_supplier_id uuid,
  p_organization_id uuid
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
  from public.suppliers as s
  where s.id = p_supplier_id
  limit 1;

  if v_org_id is null then
    raise exception 'Поставщик не найден' using errcode = '22023';
  end if;

  if p_organization_id is not null and p_organization_id <> v_org_id then
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
    from public.supplier_price_lists as spl
    where spl.supplier_id = p_supplier_id
      and spl.organization_id = v_org_id
      and coalesce(spl.status, 'active') <> 'deleted'
  ),
  item_counts as (
    select
      spi.price_list_id,
      count(*)::integer as item_count
    from public.supplier_price_items as spi
    where spi.organization_id = v_org_id
      and coalesce(spi.status, 'active') <> 'deleted'
    group by spi.price_list_id
  ),
  legal_ids as (
    select
      sple.price_list_id,
      array_agg(distinct le.id order by le.id) as legal_entity_ids
    from public.supplier_price_list_legal_entities as sple
    join public.legal_entities as le
      on le.id = sple.legal_entity_id
     and le.organization_id = v_org_id
     and coalesce(le.status, 'active') <> 'deleted'
    where sple.organization_id = v_org_id
      and coalesce(sple.status, 'active') <> 'deleted'
    group by sple.price_list_id
  ),
  legal_names as (
    select
      sple.price_list_id,
      array_agg(distinct le.name order by le.name) as legal_entity_names
    from public.supplier_price_list_legal_entities as sple
    join public.legal_entities as le
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
  from list_rows as lr
  left join item_counts as ic
    on ic.price_list_id = lr.id
  left join legal_ids as li
    on li.price_list_id = lr.id
  left join legal_names as ln
    on ln.price_list_id = lr.id
  order by lr.created_at desc;
end;
$$;

create or replace function public.owner_create_supplier_price_list(
  p_organization_id uuid,
  p_supplier_id uuid,
  p_title text,
  p_source_filename text default '',
  p_uploaded_by uuid default null,
  p_legal_entity_ids uuid[] default '{}'::uuid[],
  p_status text default 'active'
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
  v_inserted_id uuid;
begin
  select s.organization_id
    into v_org_id
  from public.suppliers as s
  where s.id = p_supplier_id
  limit 1;

  if v_org_id is null then
    raise exception 'Поставщик не найден' using errcode = '22023';
  end if;

  if p_organization_id is not null and p_organization_id <> v_org_id then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if not public.has_permission(v_org_id, 'price_lists.upload') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if coalesce(trim(p_title), '') = '' then
    raise exception 'Название прайса обязательно' using errcode = '22023';
  end if;

  if coalesce(array_length(p_legal_entity_ids, 1), 0) > 0 then
    if exists (
      select 1
      from unnest(p_legal_entity_ids) as ids(legal_entity_id)
      left join public.legal_entities as le
        on le.id = ids.legal_entity_id
       and le.organization_id = v_org_id
       and coalesce(le.status, 'active') <> 'deleted'
      where le.id is null
    ) then
      raise exception 'Выберите юрлицо из списка. Сейчас выбрано некорректное значение.' using errcode = '22023';
    end if;
  end if;

  with inserted_price_list as (
    insert into public.supplier_price_lists as spl (
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
      p_supplier_id,
      trim(p_title),
      trim(p_title),
      coalesce(trim(p_source_filename), ''),
      p_uploaded_by,
      case
        when coalesce(lower(trim(p_status)), 'active') in ('active', 'archived', 'inactive') then lower(trim(p_status))
        else 'active'
      end,
      now(),
      now()
    )
    returning spl.id as created_id
  )
  select inserted_price_list.created_id
    into v_inserted_id
  from inserted_price_list;

  if coalesce(array_length(p_legal_entity_ids, 1), 0) > 0 then
    insert into public.supplier_price_list_legal_entities as sple (
      price_list_id,
      legal_entity_id,
      organization_id,
      status,
      created_at
    )
    select
      v_inserted_id,
      le.id,
      v_org_id,
      'active',
      now()
    from public.legal_entities as le
    where le.organization_id = v_org_id
      and coalesce(le.status, 'active') <> 'deleted'
      and le.id = any(p_legal_entity_ids)
    on conflict (price_list_id, legal_entity_id)
    do update set
      organization_id = excluded.organization_id,
      status = 'active';
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
    from public.supplier_price_lists as spl
    where spl.id = v_inserted_id
      and spl.organization_id = v_org_id
      and coalesce(spl.status, 'active') <> 'deleted'
  ),
  item_counts as (
    select
      spi.price_list_id,
      count(*)::integer as item_count
    from public.supplier_price_items as spi
    where spi.organization_id = v_org_id
      and coalesce(spi.status, 'active') <> 'deleted'
    group by spi.price_list_id
  ),
  legal_ids as (
    select
      sple.price_list_id,
      array_agg(distinct le.id order by le.id) as legal_entity_ids
    from public.supplier_price_list_legal_entities as sple
    join public.legal_entities as le
      on le.id = sple.legal_entity_id
     and le.organization_id = v_org_id
     and coalesce(le.status, 'active') <> 'deleted'
    where sple.organization_id = v_org_id
      and coalesce(sple.status, 'active') <> 'deleted'
    group by sple.price_list_id
  ),
  legal_names as (
    select
      sple.price_list_id,
      array_agg(distinct le.name order by le.name) as legal_entity_names
    from public.supplier_price_list_legal_entities as sple
    join public.legal_entities as le
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
  from list_rows as lr
  left join item_counts as ic
    on ic.price_list_id = lr.id
  left join legal_ids as li
    on li.price_list_id = lr.id
  left join legal_names as ln
    on ln.price_list_id = lr.id;
end;
$$;

create or replace function public.owner_archive_supplier_price_list(
  p_price_list_id uuid,
  p_organization_id uuid default null
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
  select spl.organization_id
    into v_org_id
  from public.supplier_price_lists as spl
  where spl.id = p_price_list_id
  limit 1;

  if v_org_id is null then
    raise exception 'Прайс-лист не найден' using errcode = '22023';
  end if;

  if p_organization_id is not null and p_organization_id <> v_org_id then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if not public.has_permission(v_org_id, 'price_lists.delete') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  update public.supplier_price_lists as spl
     set status = 'archived',
         updated_at = now()
   where spl.id = p_price_list_id
     and spl.organization_id = v_org_id;

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
    from public.supplier_price_lists as spl
    where spl.id = p_price_list_id
      and spl.organization_id = v_org_id
      and coalesce(spl.status, 'active') <> 'deleted'
  ),
  item_counts as (
    select
      spi.price_list_id,
      count(*)::integer as item_count
    from public.supplier_price_items as spi
    where spi.organization_id = v_org_id
      and coalesce(spi.status, 'active') <> 'deleted'
    group by spi.price_list_id
  ),
  legal_ids as (
    select
      sple.price_list_id,
      array_agg(distinct le.id order by le.id) as legal_entity_ids
    from public.supplier_price_list_legal_entities as sple
    join public.legal_entities as le
      on le.id = sple.legal_entity_id
     and le.organization_id = v_org_id
     and coalesce(le.status, 'active') <> 'deleted'
    where sple.organization_id = v_org_id
      and coalesce(sple.status, 'active') <> 'deleted'
    group by sple.price_list_id
  ),
  legal_names as (
    select
      sple.price_list_id,
      array_agg(distinct le.name order by le.name) as legal_entity_names
    from public.supplier_price_list_legal_entities as sple
    join public.legal_entities as le
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
  from list_rows as lr
  left join item_counts as ic
    on ic.price_list_id = lr.id
  left join legal_ids as li
    on li.price_list_id = lr.id
  left join legal_names as ln
    on ln.price_list_id = lr.id;
end;
$$;

create or replace function public.owner_delete_supplier_price_list(
  p_price_list_id uuid,
  p_organization_id uuid default null
)
returns table (
  deleted_id uuid,
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
  from public.supplier_price_lists as spl
  where spl.id = p_price_list_id
  limit 1;

  if v_org_id is null then
    raise exception 'Прайс-лист не найден' using errcode = '22023';
  end if;

  if p_organization_id is not null and p_organization_id <> v_org_id then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if not public.has_permission(v_org_id, 'price_lists.delete') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  delete from public.supplier_price_items as spi
   where spi.price_list_id = p_price_list_id
     and spi.organization_id = v_org_id;
  get diagnostics v_removed_items = row_count;

  delete from public.supplier_price_list_legal_entities as sple
   where sple.price_list_id = p_price_list_id
     and sple.organization_id = v_org_id;
  get diagnostics v_removed_legals = row_count;

  delete from public.supplier_price_lists as spl
   where spl.id = p_price_list_id
     and spl.organization_id = v_org_id;

  return query
  select
    p_price_list_id as deleted_id,
    v_org_id as organization_id,
    v_supplier_id as supplier_id,
    v_removed_items as removed_items_count,
    v_removed_legals as removed_legal_entities_count;
end;
$$;

create or replace function public.owner_list_supplier_price_items(
  p_price_list_id uuid,
  p_organization_id uuid
)
returns table (
  id uuid,
  price_list_id uuid,
  organization_id uuid,
  supplier_id uuid,
  raw_name text,
  original_name text,
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
  select spl.organization_id
    into v_org_id
  from public.supplier_price_lists as spl
  where spl.id = p_price_list_id
  limit 1;

  if v_org_id is null then
    raise exception 'Прайс-лист не найден' using errcode = '22023';
  end if;

  if p_organization_id is not null and p_organization_id <> v_org_id then
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
    coalesce(nullif(spi.original_name, ''), coalesce(nullif(spi.raw_name, ''), '')) as original_name,
    coalesce(nullif(spi.normalized_name, ''), lower(coalesce(nullif(spi.raw_name, ''), ''))) as normalized_name,
    spi.unit,
    spi.price,
    coalesce(spi.currency, 'RUB') as currency,
    spi.raw_row,
    spi.row_index,
    coalesce(spi.status, 'active') as status,
    spi.created_at,
    spi.updated_at
  from public.supplier_price_items as spi
  where spi.price_list_id = p_price_list_id
    and spi.organization_id = v_org_id
    and coalesce(spi.status, 'active') <> 'deleted'
  order by spi.row_index asc, spi.created_at asc;
end;
$$;

create or replace function public.owner_import_supplier_price_items(
  p_price_list_id uuid,
  p_items jsonb,
  p_organization_id uuid default null
)
returns table (
  id uuid,
  price_list_id uuid,
  organization_id uuid,
  supplier_id uuid,
  raw_name text,
  original_name text,
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
  from public.supplier_price_lists as spl
  where spl.id = p_price_list_id
  limit 1;

  if v_org_id is null then
    raise exception 'Прайс-лист не найден' using errcode = '22023';
  end if;

  if p_organization_id is not null and p_organization_id <> v_org_id then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if not public.has_permission(v_org_id, 'price_lists.upload') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  with src_rows as (
    select
      src.src_row_index as src_row_index,
      nullif(trim(coalesce(src.src_raw_name, '')), '') as src_raw_name,
      nullif(trim(coalesce(src.src_original_name, src.src_raw_name, '')), '') as src_original_name,
      nullif(trim(coalesce(src.src_normalized_name, '')), '') as src_normalized_name,
      nullif(trim(coalesce(src.src_unit, '')), '') as src_unit,
      nullif(trim(coalesce(src.src_currency, 'RUB')), '') as src_currency,
      coalesce(src.src_raw_row, '{}'::jsonb) as src_raw_row,
      nullif(regexp_replace(coalesce(src.src_price::text, ''), '[^0-9,.-]', '', 'g'), '') as src_price_text
    from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as src(
      src_raw_name text,
      src_original_name text,
      src_normalized_name text,
      src_unit text,
      src_price text,
      src_currency text,
      src_row_index integer,
      src_raw_row jsonb
    )
  ),
  filtered_rows as (
    select
      src_rows.src_row_index,
      src_rows.src_raw_name,
      coalesce(nullif(src_rows.src_original_name, ''), src_rows.src_raw_name) as src_original_name,
      coalesce(nullif(src_rows.src_normalized_name, ''), src_rows.src_raw_name) as src_normalized_name,
      src_rows.src_unit,
      coalesce(nullif(src_rows.src_currency, ''), 'RUB') as src_currency,
      src_rows.src_raw_row,
      replace(src_rows.src_price_text, ',', '.') as src_price_text
    from src_rows
    where src_rows.src_row_index is not null
      and coalesce(src_rows.src_raw_name, '') <> ''
      and src_rows.src_price_text is not null
      and trim(src_rows.src_price_text) <> ''
  ),
  upserted_rows as (
    insert into public.supplier_price_items as spi (
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
      p_price_list_id,
      v_org_id,
      v_supplier_id,
      f.src_raw_name,
      f.src_original_name,
      coalesce(nullif(f.src_normalized_name, ''), f.src_raw_name) as normalized_name,
      f.src_unit,
      f.src_price_text::numeric,
      coalesce(nullif(f.src_currency, ''), 'RUB') as currency,
      f.src_raw_row,
      f.src_row_index,
      'active',
      now(),
      now()
    from filtered_rows as f
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
      status = 'active',
      updated_at = now()
    returning spi.id as inserted_id
  )
  select
    spi.id,
    spi.price_list_id,
    spi.organization_id,
    spi.supplier_id,
    spi.raw_name,
    spi.original_name,
    spi.normalized_name,
    spi.unit,
    spi.price,
    spi.currency,
    spi.raw_row,
    spi.row_index,
    spi.status,
    spi.created_at,
    spi.updated_at
  from public.supplier_price_items as spi
  join upserted_rows as ur
    on ur.inserted_id = spi.id
  order by spi.row_index asc, spi.created_at asc;
end;
$$;

grant execute on function public.owner_list_supplier_price_lists(uuid, uuid) to authenticated;
grant execute on function public.owner_create_supplier_price_list(uuid, uuid, text, text, uuid, uuid[], text) to authenticated;
grant execute on function public.owner_archive_supplier_price_list(uuid, uuid) to authenticated;
grant execute on function public.owner_delete_supplier_price_list(uuid, uuid) to authenticated;
grant execute on function public.owner_list_supplier_price_items(uuid, uuid) to authenticated;
grant execute on function public.owner_import_supplier_price_items(uuid, jsonb, uuid) to authenticated;

notify pgrst, 'reload schema';

-- Self-checks:
-- select proname, pg_get_function_arguments(p.oid), pg_get_function_result(p.oid)
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public' and p.proname like 'owner_%supplier_price%';
--
-- select * from public.owner_list_supplier_price_lists('<supplier_uuid>'::uuid, '<org_uuid>'::uuid);
-- select * from public.owner_import_supplier_price_items('<price_list_uuid>'::uuid, '[{"row_index":1,"raw_name":"A","price":"10","currency":"RUB"},{"row_index":2,"raw_name":"B","price":"20"}]'::jsonb, '<org_uuid>'::uuid);
-- select count(*) from public.supplier_price_items where price_list_id = '<price_list_uuid>'::uuid and coalesce(status, 'active') <> 'deleted';

commit;
