create extension if not exists "pgcrypto";

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active',
  city text not null default '',
  address text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.organizations
  add column if not exists name text,
  add column if not exists status text not null default 'active',
  add column if not exists city text not null default '',
  add column if not exists address text not null default '',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  user_profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'manager',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_members_profile_match check (profile_id = user_profile_id),
  constraint organization_members_unique unique (organization_id, profile_id)
);

alter table if exists public.organization_members
  add column if not exists profile_id uuid,
  add column if not exists user_profile_id uuid,
  add column if not exists role text not null default 'manager',
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.organization_members
   set profile_id = coalesce(profile_id, user_profile_id),
       user_profile_id = coalesce(user_profile_id, profile_id)
 where profile_id is distinct from user_profile_id
    or profile_id is null
    or user_profile_id is null;

create table if not exists public.legal_entities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  inn text not null default '',
  kpp text not null default '',
  ogrn text not null default '',
  legal_address text not null default '',
  actual_address text not null default '',
  contact_name text not null default '',
  contact_phone text not null default '',
  contact_email text not null default '',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.legal_entities
  add column if not exists organization_id uuid,
  add column if not exists name text,
  add column if not exists inn text not null default '',
  add column if not exists kpp text not null default '',
  add column if not exists ogrn text not null default '',
  add column if not exists legal_address text not null default '',
  add column if not exists actual_address text not null default '',
  add column if not exists contact_name text not null default '',
  add column if not exists contact_phone text not null default '',
  add column if not exists contact_email text not null default '',
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  inn text not null default '',
  contact_name text not null default '',
  contact_person text not null default '',
  phone text not null default '',
  email text not null default '',
  comment text not null default '',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.suppliers
  add column if not exists organization_id uuid,
  add column if not exists name text,
  add column if not exists inn text not null default '',
  add column if not exists contact_name text not null default '',
  add column if not exists contact_person text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists email text not null default '',
  add column if not exists comment text not null default '',
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

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

alter table if exists public.supplier_legal_entities
  add column if not exists supplier_id uuid,
  add column if not exists legal_entity_id uuid,
  add column if not exists organization_id uuid,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.supplier_price_lists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  uploaded_by_user_profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  file_path text not null default '',
  status text not null default 'active',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.supplier_price_lists
  add column if not exists organization_id uuid,
  add column if not exists supplier_id uuid,
  add column if not exists uploaded_by_user_profile_id uuid,
  add column if not exists name text,
  add column if not exists file_path text not null default '',
  add column if not exists status text not null default 'active',
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

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

alter table if exists public.supplier_price_items
  add column if not exists price_list_id uuid,
  add column if not exists organization_id uuid,
  add column if not exists original_name text,
  add column if not exists product_name text not null default '',
  add column if not exists price numeric(14,2) not null default 0,
  add column if not exists unit text not null default '',
  add column if not exists comment text not null default '',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_organizations_status on public.organizations(status);
create index if not exists idx_organizations_city on public.organizations(city);
create index if not exists idx_organization_members_org_id on public.organization_members(organization_id);
create index if not exists idx_organization_members_profile_id on public.organization_members(profile_id);
create index if not exists idx_organization_members_status on public.organization_members(status);
create index if not exists idx_legal_entities_org_id on public.legal_entities(organization_id);
create index if not exists idx_legal_entities_status on public.legal_entities(status);
create index if not exists idx_legal_entities_inn on public.legal_entities(inn);
create index if not exists idx_suppliers_org_id on public.suppliers(organization_id);
create index if not exists idx_suppliers_status on public.suppliers(status);
create index if not exists idx_suppliers_inn on public.suppliers(inn);
create index if not exists idx_supplier_legal_entities_supplier_id on public.supplier_legal_entities(supplier_id);
create index if not exists idx_supplier_legal_entities_legal_entity_id on public.supplier_legal_entities(legal_entity_id);
create index if not exists idx_supplier_legal_entities_org_id on public.supplier_legal_entities(organization_id);
create index if not exists idx_supplier_legal_entities_status on public.supplier_legal_entities(status);
create index if not exists idx_supplier_price_lists_org_id on public.supplier_price_lists(organization_id);
create index if not exists idx_supplier_price_lists_supplier_id on public.supplier_price_lists(supplier_id);
create index if not exists idx_supplier_price_lists_status on public.supplier_price_lists(status);
create index if not exists idx_supplier_price_items_price_list_id on public.supplier_price_items(price_list_id);
create index if not exists idx_supplier_price_items_org_id on public.supplier_price_items(organization_id);

create or replace function public._touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_organizations_touch_updated_at on public.organizations;
create trigger trg_organizations_touch_updated_at
before update on public.organizations
for each row execute procedure public._touch_updated_at();

drop trigger if exists trg_organization_members_touch_updated_at on public.organization_members;
create trigger trg_organization_members_touch_updated_at
before update on public.organization_members
for each row execute procedure public._touch_updated_at();

drop trigger if exists trg_legal_entities_touch_updated_at on public.legal_entities;
create trigger trg_legal_entities_touch_updated_at
before update on public.legal_entities
for each row execute procedure public._touch_updated_at();

drop trigger if exists trg_suppliers_touch_updated_at on public.suppliers;
create trigger trg_suppliers_touch_updated_at
before update on public.suppliers
for each row execute procedure public._touch_updated_at();

drop trigger if exists trg_supplier_legal_entities_touch_updated_at on public.supplier_legal_entities;
create trigger trg_supplier_legal_entities_touch_updated_at
before update on public.supplier_legal_entities
for each row execute procedure public._touch_updated_at();

drop trigger if exists trg_supplier_price_lists_touch_updated_at on public.supplier_price_lists;
create trigger trg_supplier_price_lists_touch_updated_at
before update on public.supplier_price_lists
for each row execute procedure public._touch_updated_at();

drop trigger if exists trg_supplier_price_items_touch_updated_at on public.supplier_price_items;
create trigger trg_supplier_price_items_touch_updated_at
before update on public.supplier_price_items
for each row execute procedure public._touch_updated_at();
