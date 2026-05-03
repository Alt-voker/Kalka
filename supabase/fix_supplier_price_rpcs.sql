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
  where spl.supplier_id = target_supplier_id
    and spl.organization_id = v_org_id
    and coalesce(spl.status, 'active') <> 'deleted'
  group by
    spl.id,
    spl.organization_id,
    spl.supplier_id,
    spl.title,
    spl.name,
    spl.source_filename,
    spl.uploaded_by,
    spl.status,
    spl.created_at,
    spl.updated_at
  order by spl.created_at desc;
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
  v_new_price_list_id uuid;
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

  if not public.has_permission(v_org_id, 'price_lists.upload') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if coalesce(trim(target_title), '') = '' then
    raise exception 'Название прайса обязательно' using errcode = '22023';
  end if;

  if coalesce(array_length(target_legal_entity_ids, 1), 0) > 0 then
    if exists (
      select 1
      from unnest(target_legal_entity_ids) as x(legal_entity_id)
      left join public.legal_entities le
        on le.id = x.legal_entity_id
       and le.organization_id = v_org_id
       and coalesce(le.status, 'active') <> 'deleted'
      where le.id is null
    ) then
      raise exception 'Выберите юрлицо из списка. Сейчас выбрано некорректное значение.' using errcode = '22023';
    end if;
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
      case
        when coalesce(lower(trim(target_status)), 'active') in ('active', 'archived', 'inactive')
          then lower(trim(target_status))
        else 'active'
      end,
      now(),
      now()
    )
    returning public.supplier_price_lists.id
  )
  select inserted_price_list.id
    into v_new_price_list_id
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
      v_new_price_list_id,
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
  where spl.id = v_new_price_list_id
    and spl.organization_id = v_org_id
    and coalesce(spl.status, 'active') <> 'deleted'
  group by
    spl.id,
    spl.organization_id,
    spl.supplier_id,
    spl.title,
    spl.name,
    spl.source_filename,
    spl.uploaded_by,
    spl.status,
    spl.created_at,
    spl.updated_at;
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
  group by
    spl.id,
    spl.organization_id,
    spl.supplier_id,
    spl.title,
    spl.name,
    spl.source_filename,
    spl.uploaded_by,
    spl.status,
    spl.created_at,
    spl.updated_at;
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
  select spl.organization_id
    into v_org_id
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

  delete from public.supplier_price_items spi
   where spi.price_list_id = target_price_list_id
     and spi.organization_id = v_org_id;

  return query
  with incoming as (
    select
      row_number() over () as rn,
      nullif(trim(coalesce(item->>'raw_name', item->>'name', '')), '') as raw_name,
      nullif(trim(coalesce(item->>'normalized_name', item->>'raw_name', item->>'name', '')), '') as normalized_name,
      nullif(trim(coalesce(item->>'unit', '')), '') as unit,
      nullif(trim(coalesce(item->>'currency', 'RUB')), '') as currency,
      coalesce(item->'raw_row', '{}'::jsonb) as raw_row,
      nullif(trim(coalesce(item->>'row_index', '')), '') as row_index_text,
      nullif(trim(coalesce(item->>'status', 'active')), '') as status_text,
      nullif(regexp_replace(coalesce(item->>'price', ''), '[^0-9,\.-]', '', 'g'), '') as price_text
    from jsonb_array_elements(coalesce(target_items, '[]'::jsonb)) as item
  ),
  parsed as (
    select
      rn,
      raw_name,
      normalized_name,
      unit,
      currency,
      raw_row,
      row_index_text,
      status_text,
      case
        when price_text is null then null
        else replace(price_text, ',', '.')
      end as price_value
    from incoming
  )
  insert into public.supplier_price_items (
    price_list_id,
    organization_id,
    supplier_id,
    raw_name,
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
    coalesce(raw_name, '') as raw_name,
    coalesce(normalized_name, lower(coalesce(raw_name, ''))) as normalized_name,
    unit,
    case
      when price_value is null or trim(price_value) = '' then null
      else price_value::numeric
    end as price,
    coalesce(currency, 'RUB') as currency,
    coalesce(raw_row, '{}'::jsonb) as raw_row,
    coalesce(nullif(row_index_text, '')::integer, rn::integer) as row_index,
    case
      when lower(coalesce(status_text, 'active')) in ('active', 'inactive', 'archived', 'deleted')
        then lower(coalesce(status_text, 'active'))
      else 'active'
    end as status,
    now(),
    now()
  from parsed
  where coalesce(raw_name, '') <> ''
    and price_value is not null
    and trim(price_value) <> ''
  returning *;
end;
$$;

grant execute on function public.owner_list_supplier_price_lists(uuid, uuid) to authenticated;
grant execute on function public.owner_create_supplier_price_list(uuid, uuid, text, text, uuid, uuid[], text) to authenticated;
grant execute on function public.owner_archive_supplier_price_list(uuid, uuid) to authenticated;
grant execute on function public.owner_list_supplier_price_items(uuid, uuid) to authenticated;
grant execute on function public.owner_import_supplier_price_items(uuid, jsonb, uuid) to authenticated;

notify pgrst, 'reload schema';
