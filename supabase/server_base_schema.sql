create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'restaurant',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.legal_entities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  inn text not null default '',
  kpp text not null default '',
  ogrn text not null default '',
  legal_address text not null default '',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null,
  email text not null unique,
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_profile_id uuid not null references public.user_profiles(id) on delete cascade,
  role text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_members_role_check check (
    role in (
      'platform_owner',
      'organization_owner',
      'manager',
      'buyer',
      'chef',
      'bar_manager',
      'accountant',
      'warehouse'
    )
  ),
  constraint organization_members_unique unique (organization_id, user_profile_id)
);

create table if not exists public.member_legal_entities (
  id uuid primary key default gen_random_uuid(),
  organization_member_id uuid not null references public.organization_members(id) on delete cascade,
  legal_entity_id uuid not null references public.legal_entities(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint member_legal_entities_unique unique (organization_member_id, legal_entity_id)
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  inn text not null default '',
  phone text not null default '',
  email text not null default '',
  contact_person text not null default '',
  comment text not null default '',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint suppliers_unique_per_org unique (organization_id, name)
);

create table if not exists public.supplier_price_lists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  uploaded_by_user_profile_id uuid references public.user_profiles(id) on delete set null,
  name text not null,
  file_path text not null default '',
  status text not null default 'active',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_price_list_legal_entities (
  id uuid primary key default gen_random_uuid(),
  price_list_id uuid not null references public.supplier_price_lists(id) on delete cascade,
  legal_entity_id uuid not null references public.legal_entities(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint supplier_price_list_legal_entities_unique unique (price_list_id, legal_entity_id)
);

create table if not exists public.supplier_price_items (
  id uuid primary key default gen_random_uuid(),
  price_list_id uuid not null references public.supplier_price_lists(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  original_name text not null,
  product_name text not null default '',
  price numeric(14,2) not null default 0,
  unit text not null default '',
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_profile_id uuid references public.user_profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null default '',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_legal_entities_org_id on public.legal_entities(organization_id);
create index if not exists idx_user_profiles_auth_user_id on public.user_profiles(auth_user_id);
create index if not exists idx_org_members_org_id on public.organization_members(organization_id);
create index if not exists idx_org_members_user_profile_id on public.organization_members(user_profile_id);
create index if not exists idx_member_legal_entities_member_id on public.member_legal_entities(organization_member_id);
create index if not exists idx_member_legal_entities_legal_id on public.member_legal_entities(legal_entity_id);
create index if not exists idx_suppliers_org_id on public.suppliers(organization_id);
create index if not exists idx_supplier_price_lists_org_id on public.supplier_price_lists(organization_id);
create index if not exists idx_supplier_price_lists_supplier_id on public.supplier_price_lists(supplier_id);
create index if not exists idx_supplier_price_list_legals_price_list_id on public.supplier_price_list_legal_entities(price_list_id);
create index if not exists idx_supplier_price_list_legals_legal_entity_id on public.supplier_price_list_legal_entities(legal_entity_id);
create index if not exists idx_supplier_price_items_price_list_id on public.supplier_price_items(price_list_id);
create index if not exists idx_supplier_price_items_org_id on public.supplier_price_items(organization_id);
create index if not exists idx_audit_logs_org_id on public.audit_logs(organization_id);
create index if not exists idx_audit_logs_user_profile_id on public.audit_logs(user_profile_id);

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_organizations on public.organizations;
create trigger set_updated_at_organizations
before update on public.organizations
for each row execute procedure public.tg_set_updated_at();

drop trigger if exists set_updated_at_legal_entities on public.legal_entities;
create trigger set_updated_at_legal_entities
before update on public.legal_entities
for each row execute procedure public.tg_set_updated_at();

drop trigger if exists set_updated_at_user_profiles on public.user_profiles;
create trigger set_updated_at_user_profiles
before update on public.user_profiles
for each row execute procedure public.tg_set_updated_at();

drop trigger if exists set_updated_at_org_members on public.organization_members;
create trigger set_updated_at_org_members
before update on public.organization_members
for each row execute procedure public.tg_set_updated_at();

drop trigger if exists set_updated_at_suppliers on public.suppliers;
create trigger set_updated_at_suppliers
before update on public.suppliers
for each row execute procedure public.tg_set_updated_at();

drop trigger if exists set_updated_at_price_lists on public.supplier_price_lists;
create trigger set_updated_at_price_lists
before update on public.supplier_price_lists
for each row execute procedure public.tg_set_updated_at();

drop trigger if exists set_updated_at_price_items on public.supplier_price_items;
create trigger set_updated_at_price_items
before update on public.supplier_price_items
for each row execute procedure public.tg_set_updated_at();

create or replace function public.current_user_auth_id()
returns uuid
language sql
stable
as $$
  select auth.uid()
$$;

create or replace function public.current_user_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select up.id
  from public.user_profiles up
  where up.auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.current_user_is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.organization_members om
    join public.user_profiles up on up.id = om.user_profile_id
    where up.auth_user_id = auth.uid()
      and om.status = 'active'
      and om.role = 'platform_owner'
  )
$$;

create or replace function public.current_user_organization_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(array_agg(distinct om.organization_id), '{}'::uuid[])
  from public.organization_members om
  join public.user_profiles up on up.id = om.user_profile_id
  where up.auth_user_id = auth.uid()
    and om.status = 'active'
$$;

create or replace function public.current_user_legal_entity_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(array_agg(distinct mle.legal_entity_id), '{}'::uuid[])
  from public.organization_members om
  join public.user_profiles up on up.id = om.user_profile_id
  join public.member_legal_entities mle on mle.organization_member_id = om.id
  where up.auth_user_id = auth.uid()
    and om.status = 'active'
$$;

create or replace function public.current_user_role_for_organization(target_org_id uuid)
returns text
language sql
stable
security definer
set search_path = public
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
    when 'organization_owner' then 1
    when 'manager' then 2
    when 'buyer' then 3
    when 'chef' then 4
    when 'bar_manager' then 5
    when 'accountant' then 6
    when 'warehouse' then 7
    else 99 end
  limit 1
$$;

create or replace function public.current_user_can_access_organization(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.current_user_is_platform_owner()
    or exists (
      select 1
      from public.organization_members om
      join public.user_profiles up on up.id = om.user_profile_id
      where up.auth_user_id = auth.uid()
        and om.status = 'active'
        and om.organization_id = target_org_id
    )
$$;

create or replace function public.current_user_can_access_legal_entity(target_legal_entity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.current_user_is_platform_owner()
    or exists (
      select 1
      from public.member_legal_entities mle
      join public.organization_members om on om.id = mle.organization_member_id
      join public.user_profiles up on up.id = om.user_profile_id
      where up.auth_user_id = auth.uid()
        and om.status = 'active'
        and mle.legal_entity_id = target_legal_entity_id
    )
$$;

create or replace function public.current_user_can_access_price_list(target_price_list_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.current_user_is_platform_owner()
    or exists (
      select 1
      from public.supplier_price_lists spl
      where spl.id = target_price_list_id
        and public.current_user_can_access_organization(spl.organization_id)
        and (
          not exists (
            select 1
            from public.supplier_price_list_legal_entities sple
            where sple.price_list_id = spl.id
          )
          or exists (
            select 1
            from public.supplier_price_list_legal_entities sple
            where sple.price_list_id = spl.id
              and public.current_user_can_access_legal_entity(sple.legal_entity_id)
          )
        )
    )
$$;

alter table public.organizations enable row level security;
alter table public.legal_entities enable row level security;
alter table public.user_profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.member_legal_entities enable row level security;
alter table public.suppliers enable row level security;
alter table public.supplier_price_lists enable row level security;
alter table public.supplier_price_list_legal_entities enable row level security;
alter table public.supplier_price_items enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists organizations_select on public.organizations;
create policy organizations_select
on public.organizations
for select
to authenticated
using (public.current_user_can_access_organization(id));

drop policy if exists organizations_write on public.organizations;
create policy organizations_write
on public.organizations
for all
to authenticated
using (
  public.current_user_is_platform_owner()
  or public.current_user_role_for_organization(id) = 'organization_owner'
)
with check (
  public.current_user_is_platform_owner()
  or public.current_user_role_for_organization(id) = 'organization_owner'
);

drop policy if exists legal_entities_select on public.legal_entities;
create policy legal_entities_select
on public.legal_entities
for select
to authenticated
using (public.current_user_can_access_organization(organization_id));

drop policy if exists legal_entities_write on public.legal_entities;
create policy legal_entities_write
on public.legal_entities
for all
to authenticated
using (
  public.current_user_is_platform_owner()
  or public.current_user_role_for_organization(organization_id) = 'organization_owner'
)
with check (
  public.current_user_is_platform_owner()
  or public.current_user_role_for_organization(organization_id) = 'organization_owner'
);

drop policy if exists user_profiles_select_own on public.user_profiles;
create policy user_profiles_select_own
on public.user_profiles
for select
to authenticated
using (auth_user_id = auth.uid() or public.current_user_is_platform_owner());

drop policy if exists user_profiles_write_own on public.user_profiles;
create policy user_profiles_write_own
on public.user_profiles
for all
to authenticated
using (auth_user_id = auth.uid() or public.current_user_is_platform_owner())
with check (auth_user_id = auth.uid() or public.current_user_is_platform_owner());

drop policy if exists organization_members_select on public.organization_members;
create policy organization_members_select
on public.organization_members
for select
to authenticated
using (
  public.current_user_is_platform_owner()
  or public.current_user_can_access_organization(organization_id)
);

drop policy if exists organization_members_write on public.organization_members;
create policy organization_members_write
on public.organization_members
for all
to authenticated
using (
  public.current_user_is_platform_owner()
  or public.current_user_role_for_organization(organization_id) = 'organization_owner'
)
with check (
  public.current_user_is_platform_owner()
  or public.current_user_role_for_organization(organization_id) = 'organization_owner'
);

drop policy if exists member_legal_entities_select on public.member_legal_entities;
create policy member_legal_entities_select
on public.member_legal_entities
for select
to authenticated
using (
  public.current_user_is_platform_owner()
  or exists (
    select 1
    from public.organization_members om
    where om.id = organization_member_id
      and public.current_user_can_access_organization(om.organization_id)
  )
);

drop policy if exists member_legal_entities_write on public.member_legal_entities;
create policy member_legal_entities_write
on public.member_legal_entities
for all
to authenticated
using (
  public.current_user_is_platform_owner()
  or exists (
    select 1
    from public.organization_members om
    where om.id = organization_member_id
      and public.current_user_role_for_organization(om.organization_id) = 'organization_owner'
  )
)
with check (
  public.current_user_is_platform_owner()
  or exists (
    select 1
    from public.organization_members om
    where om.id = organization_member_id
      and public.current_user_role_for_organization(om.organization_id) = 'organization_owner'
  )
);

drop policy if exists suppliers_select on public.suppliers;
create policy suppliers_select
on public.suppliers
for select
to authenticated
using (public.current_user_can_access_organization(organization_id));

drop policy if exists suppliers_write on public.suppliers;
create policy suppliers_write
on public.suppliers
for all
to authenticated
using (
  public.current_user_is_platform_owner()
  or public.current_user_role_for_organization(organization_id) = 'organization_owner'
)
with check (
  public.current_user_is_platform_owner()
  or public.current_user_role_for_organization(organization_id) = 'organization_owner'
);

drop policy if exists supplier_price_lists_select on public.supplier_price_lists;
create policy supplier_price_lists_select
on public.supplier_price_lists
for select
to authenticated
using (public.current_user_can_access_price_list(id));

drop policy if exists supplier_price_lists_write on public.supplier_price_lists;
create policy supplier_price_lists_write
on public.supplier_price_lists
for all
to authenticated
using (
  public.current_user_is_platform_owner()
  or public.current_user_role_for_organization(organization_id) = 'organization_owner'
)
with check (
  public.current_user_is_platform_owner()
  or public.current_user_role_for_organization(organization_id) = 'organization_owner'
);

drop policy if exists supplier_price_list_legal_entities_select on public.supplier_price_list_legal_entities;
create policy supplier_price_list_legal_entities_select
on public.supplier_price_list_legal_entities
for select
to authenticated
using (public.current_user_can_access_price_list(price_list_id));

drop policy if exists supplier_price_list_legal_entities_write on public.supplier_price_list_legal_entities;
create policy supplier_price_list_legal_entities_write
on public.supplier_price_list_legal_entities
for all
to authenticated
using (
  public.current_user_is_platform_owner()
  or exists (
    select 1
    from public.supplier_price_lists spl
    where spl.id = price_list_id
      and public.current_user_role_for_organization(spl.organization_id) = 'organization_owner'
  )
)
with check (
  public.current_user_is_platform_owner()
  or exists (
    select 1
    from public.supplier_price_lists spl
    where spl.id = price_list_id
      and public.current_user_role_for_organization(spl.organization_id) = 'organization_owner'
  )
);

drop policy if exists supplier_price_items_select on public.supplier_price_items;
create policy supplier_price_items_select
on public.supplier_price_items
for select
to authenticated
using (public.current_user_can_access_price_list(price_list_id));

drop policy if exists supplier_price_items_write on public.supplier_price_items;
create policy supplier_price_items_write
on public.supplier_price_items
for all
to authenticated
using (
  public.current_user_is_platform_owner()
  or exists (
    select 1
    from public.supplier_price_lists spl
    where spl.id = price_list_id
      and public.current_user_role_for_organization(spl.organization_id) = 'organization_owner'
  )
)
with check (
  public.current_user_is_platform_owner()
  or exists (
    select 1
    from public.supplier_price_lists spl
    where spl.id = price_list_id
      and public.current_user_role_for_organization(spl.organization_id) = 'organization_owner'
  )
);

drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select
on public.audit_logs
for select
to authenticated
using (
  public.current_user_is_platform_owner()
  or public.current_user_can_access_organization(organization_id)
);

drop policy if exists audit_logs_write on public.audit_logs;
create policy audit_logs_write
on public.audit_logs
for insert
to authenticated
with check (
  public.current_user_is_platform_owner()
  or public.current_user_can_access_organization(organization_id)
);
