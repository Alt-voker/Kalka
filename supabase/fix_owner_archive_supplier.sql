begin;

drop function if exists public.owner_archive_supplier(uuid, uuid);
drop function if exists public.owner_delete_supplier(uuid, uuid);

create or replace function public.owner_archive_supplier(
  target_supplier_id uuid,
  target_organization_id uuid default null
)
returns table (
  id uuid,
  organization_id uuid,
  name text,
  inn text,
  contact_name text,
  phone text,
  email text,
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

  if not public.has_permission(v_org_id, 'suppliers.edit')
     and not public.has_permission(v_org_id, 'suppliers.delete') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  update public.suppliers s
     set status = 'archived',
         updated_at = now()
   where s.id = target_supplier_id
     and s.organization_id = v_org_id;

  return query
  select
    s.id,
    s.organization_id,
    s.name,
    coalesce(nullif(s.inn, ''), '') as inn,
    coalesce(nullif(s.contact_name, ''), nullif(s.contact_person, ''), '') as contact_name,
    coalesce(nullif(s.phone, ''), '') as phone,
    coalesce(nullif(s.email, ''), '') as email,
    coalesce(nullif(s.status, ''), 'active') as status,
    s.created_at,
    s.updated_at
  from public.suppliers s
  where s.id = target_supplier_id
    and s.organization_id = v_org_id;
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
  contact_name text,
  phone text,
  email text,
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

  if not public.has_permission(v_org_id, 'suppliers.delete') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  update public.suppliers s
     set status = 'deleted',
         updated_at = now()
   where s.id = target_supplier_id
     and s.organization_id = v_org_id;

  return query
  select
    s.id,
    s.organization_id,
    s.name,
    coalesce(nullif(s.inn, ''), '') as inn,
    coalesce(nullif(s.contact_name, ''), nullif(s.contact_person, ''), '') as contact_name,
    coalesce(nullif(s.phone, ''), '') as phone,
    coalesce(nullif(s.email, ''), '') as email,
    coalesce(nullif(s.status, ''), 'active') as status,
    s.created_at,
    s.updated_at
  from public.suppliers s
  where s.id = target_supplier_id
    and s.organization_id = v_org_id;
end;
$$;

grant execute on function public.owner_archive_supplier(uuid, uuid) to authenticated;
grant execute on function public.owner_delete_supplier(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
