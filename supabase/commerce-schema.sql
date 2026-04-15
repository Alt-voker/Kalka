create extension if not exists "pgcrypto";

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  name text not null,
  emoji text not null default '🍽️',
  kind text not null default 'Ресторан',
  city text not null default '',
  address text not null default '',
  members jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  legacy_key text unique,
  name text not null unique,
  emoji text not null default '🏭',
  kind text not null default 'Поставщик',
  rating numeric(4,2) not null default 5,
  orders_count integer not null default 0,
  delivery text not null default '1-2 дня',
  min_order_text text not null default '₽1 000',
  status text not null default 'new',
  tags jsonb not null default '[]'::jsonb,
  contact text not null default '',
  phone text not null default '',
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  legacy_product_id text unique,
  name text not null unique,
  category text not null default 'dry',
  unit text not null default 'кг',
  emoji text not null default '',
  sticker text,
  favorite boolean not null default false,
  p_kg numeric(12,2) not null default 0,
  p_sh numeric(12,2) not null default 0,
  p_l numeric(12,2) not null default 0,
  p_ml numeric(12,2) not null default 0,
  allowed_companies jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_supplier_prices (
  id uuid primary key default gen_random_uuid(),
  legacy_sup_prod_id text unique,
  product_id uuid not null references public.products(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  supplier_name text not null,
  product_name text not null,
  category text not null default '—',
  unit text not null default 'кг',
  price numeric(12,2) not null default 0,
  p_kg numeric(12,2) not null default 0,
  p_sh numeric(12,2) not null default 0,
  p_l numeric(12,2) not null default 0,
  p_ml numeric(12,2) not null default 0,
  stock integer not null default 0,
  active boolean not null default true,
  hidden boolean not null default false,
  price_name text not null default '',
  price_type text not null default 'main',
  allowed_user_ids jsonb not null default '[]'::jsonb,
  allowed_companies jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  legacy_order_id text unique,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  restaurant_name text not null default '—',
  supplier_id uuid references public.suppliers(id) on delete set null,
  supplier_name text not null default '—',
  supplier_label text not null default '—',
  items_text text not null default '',
  total numeric(12,2) not null default 0,
  order_date text not null default '',
  status text not null default 'processing',
  comment text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tech_cards (
  id uuid primary key default gen_random_uuid(),
  legacy_tech_card_id text unique,
  name text not null,
  category text not null default 'hot',
  input_g numeric(12,2) not null default 0,
  loss_p numeric(12,2) not null default 0,
  yield_g numeric(12,2) not null default 0,
  markup numeric(12,2) not null default 0,
  ingredients jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.replace_commerce_snapshot(snapshot jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  restaurant_row jsonb;
  supplier_row jsonb;
  product_row jsonb;
  sup_prod_row jsonb;
  order_row jsonb;
  tech_card_row jsonb;
  product_uuid uuid;
  supplier_uuid uuid;
  supplier_name_value text;
  product_name_value text;
begin
  delete from public.product_supplier_prices;
  delete from public.orders;
  delete from public.tech_cards;
  delete from public.restaurants;
  delete from public.products;
  delete from public.suppliers;

  for restaurant_row in select value from jsonb_array_elements(coalesce(snapshot->'restaurants', '[]'::jsonb))
  loop
    insert into public.restaurants (
      legacy_id, name, emoji, kind, city, address, members
    ) values (
      nullif(restaurant_row->>'id', ''),
      coalesce(restaurant_row->>'name', ''),
      coalesce(restaurant_row->>'emoji', '🍽️'),
      coalesce(restaurant_row->>'type', 'Ресторан'),
      coalesce(restaurant_row->>'city', ''),
      coalesce(restaurant_row->>'addr', ''),
      coalesce(restaurant_row->'members', '[]'::jsonb)
    );
  end loop;

  for supplier_row in select value from jsonb_array_elements(coalesce(snapshot->'suppliers', '[]'::jsonb))
  loop
    insert into public.suppliers (
      legacy_key, name, emoji, kind, rating, orders_count, delivery, min_order_text,
      status, tags, contact, phone, hidden
    ) values (
      nullif(supplier_row->>'name', ''),
      coalesce(supplier_row->>'name', ''),
      coalesce(supplier_row->>'emoji', '🏭'),
      coalesce(supplier_row->>'type', 'Поставщик'),
      coalesce(nullif(supplier_row->>'rating', '')::numeric, 5),
      coalesce(nullif(supplier_row->>'orders', '')::integer, 0),
      coalesce(supplier_row->>'delivery', '1-2 дня'),
      coalesce(supplier_row->>'min', '₽1 000'),
      coalesce(supplier_row->>'status', 'new'),
      coalesce(supplier_row->'tags', '[]'::jsonb),
      coalesce(supplier_row->>'contact', ''),
      coalesce(supplier_row->>'phone', ''),
      coalesce(nullif(supplier_row->>'hidden', '')::boolean, false)
    );
  end loop;

  for product_row in select value from jsonb_array_elements(coalesce(snapshot->'products', '[]'::jsonb))
  loop
    insert into public.products (
      legacy_product_id, name, category, unit, emoji, sticker, favorite,
      p_kg, p_sh, p_l, p_ml, allowed_companies
    ) values (
      nullif(product_row->>'id', ''),
      coalesce(product_row->>'name', ''),
      coalesce(product_row->>'cat', 'dry'),
      coalesce(product_row->>'unit', 'кг'),
      coalesce(product_row->>'emoji', ''),
      nullif(product_row->>'sticker', ''),
      coalesce(nullif(product_row->>'fav', '')::boolean, false),
      coalesce(nullif(product_row->>'pKg', '')::numeric, 0),
      coalesce(nullif(product_row->>'pSh', '')::numeric, 0),
      coalesce(nullif(product_row->>'pL', '')::numeric, 0),
      coalesce(nullif(product_row->>'pMl', '')::numeric, 0),
      coalesce(product_row->'allowedCompanies', '[]'::jsonb)
    );
  end loop;

  for sup_prod_row in select value from jsonb_array_elements(coalesce(snapshot->'supProds', '[]'::jsonb))
  loop
    supplier_name_value := coalesce(sup_prod_row->>'_supplier', sup_prod_row->>'supplier', '');
    product_name_value := coalesce(sup_prod_row->>'name', '');

    select id into product_uuid from public.products where name = product_name_value limit 1;
    if product_uuid is null then
      insert into public.products (
        legacy_product_id, name, category, unit, emoji, sticker, favorite,
        p_kg, p_sh, p_l, p_ml, allowed_companies
      ) values (
        nullif(sup_prod_row->>'id', ''),
        product_name_value,
        coalesce(sup_prod_row->>'cat', 'dry'),
        coalesce(sup_prod_row->>'unit', 'кг'),
        '',
        null,
        false,
        coalesce(nullif(sup_prod_row->>'pKg', '')::numeric, 0),
        coalesce(nullif(sup_prod_row->>'pSh', '')::numeric, 0),
        coalesce(nullif(sup_prod_row->>'pL', '')::numeric, 0),
        coalesce(nullif(sup_prod_row->>'pMl', '')::numeric, 0),
        coalesce(sup_prod_row->'allowedCompanies', '[]'::jsonb)
      )
      returning id into product_uuid;
    end if;

    select id into supplier_uuid from public.suppliers where name = supplier_name_value limit 1;
    if supplier_uuid is null and supplier_name_value <> '' then
      insert into public.suppliers (
        legacy_key, name, emoji, kind, rating, orders_count, delivery, min_order_text,
        status, tags, contact, phone, hidden
      ) values (
        supplier_name_value,
        supplier_name_value,
        '🏭',
        'Поставщик',
        5,
        0,
        '1-2 дня',
        '₽1 000',
        'new',
        '[]'::jsonb,
        '',
        '',
        false
      )
      returning id into supplier_uuid;
    end if;

    insert into public.product_supplier_prices (
      legacy_sup_prod_id, product_id, supplier_id, supplier_name, product_name, category,
      unit, price, p_kg, p_sh, p_l, p_ml, stock, active, hidden, price_name,
      price_type, allowed_user_ids, allowed_companies
    ) values (
      nullif(sup_prod_row->>'id', ''),
      product_uuid,
      supplier_uuid,
      supplier_name_value,
      product_name_value,
      coalesce(sup_prod_row->>'cat', '—'),
      coalesce(sup_prod_row->>'unit', 'кг'),
      greatest(
        coalesce(nullif(sup_prod_row->>'pKg', '')::numeric, 0),
        coalesce(nullif(sup_prod_row->>'pSh', '')::numeric, 0),
        coalesce(nullif(sup_prod_row->>'pL', '')::numeric, 0),
        coalesce(nullif(sup_prod_row->>'pMl', '')::numeric, 0)
      ),
      coalesce(nullif(sup_prod_row->>'pKg', '')::numeric, 0),
      coalesce(nullif(sup_prod_row->>'pSh', '')::numeric, 0),
      coalesce(nullif(sup_prod_row->>'pL', '')::numeric, 0),
      coalesce(nullif(sup_prod_row->>'pMl', '')::numeric, 0),
      coalesce(nullif(sup_prod_row->>'stock', '')::integer, 0),
      coalesce(nullif(sup_prod_row->>'active', '')::boolean, true),
      coalesce(nullif(sup_prod_row->>'hidden', '')::boolean, false),
      coalesce(sup_prod_row->>'_priceName', ''),
      coalesce(sup_prod_row->>'_type', 'main'),
      coalesce(sup_prod_row->'allowedUserIds', '[]'::jsonb),
      coalesce(sup_prod_row->'allowedCompanies', '[]'::jsonb)
    );
  end loop;

  for order_row in select value from jsonb_array_elements(coalesce(snapshot->'orders', '[]'::jsonb))
  loop
    insert into public.orders (
      legacy_order_id, restaurant_name, supplier_name, supplier_label,
      items_text, total, order_date, status, comment
    ) values (
      nullif(order_row->>'id', ''),
      coalesce(order_row->>'rest', '—'),
      regexp_replace(coalesce(order_row->>'sup', '—'), '^[^[:space:]]+[[:space:]]*', ''),
      coalesce(order_row->>'sup', '—'),
      coalesce(order_row->>'items', ''),
      coalesce(nullif(order_row->>'sum', '')::numeric, 0),
      coalesce(order_row->>'date', ''),
      coalesce(order_row->>'status', 'processing'),
      coalesce(order_row->>'comment', '')
    );
  end loop;

  for tech_card_row in select value from jsonb_array_elements(coalesce(snapshot->'techCards', '[]'::jsonb))
  loop
    insert into public.tech_cards (
      legacy_tech_card_id, name, category, input_g, loss_p, yield_g, markup, ingredients
    ) values (
      nullif(tech_card_row->>'id', ''),
      coalesce(tech_card_row->>'name', ''),
      coalesce(tech_card_row->>'cat', 'hot'),
      coalesce(nullif(tech_card_row->>'inputG', '')::numeric, 0),
      coalesce(nullif(tech_card_row->>'lossP', '')::numeric, 0),
      coalesce(nullif(tech_card_row->>'yieldG', '')::numeric, 0),
      coalesce(nullif(tech_card_row->>'markup', '')::numeric, 0),
      coalesce(tech_card_row->'ings', '[]'::jsonb)
    );
  end loop;
end;
$$;

alter table public.restaurants enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.product_supplier_prices enable row level security;
alter table public.orders enable row level security;
alter table public.tech_cards enable row level security;

drop policy if exists "restaurants_rw_authenticated" on public.restaurants;
create policy "restaurants_rw_authenticated" on public.restaurants for all to authenticated using (true) with check (true);

drop policy if exists "suppliers_rw_authenticated" on public.suppliers;
create policy "suppliers_rw_authenticated" on public.suppliers for all to authenticated using (true) with check (true);

drop policy if exists "products_rw_authenticated" on public.products;
create policy "products_rw_authenticated" on public.products for all to authenticated using (true) with check (true);

drop policy if exists "product_supplier_prices_rw_authenticated" on public.product_supplier_prices;
create policy "product_supplier_prices_rw_authenticated" on public.product_supplier_prices for all to authenticated using (true) with check (true);

drop policy if exists "orders_rw_authenticated" on public.orders;
create policy "orders_rw_authenticated" on public.orders for all to authenticated using (true) with check (true);

drop policy if exists "tech_cards_rw_authenticated" on public.tech_cards;
create policy "tech_cards_rw_authenticated" on public.tech_cards for all to authenticated using (true) with check (true);
