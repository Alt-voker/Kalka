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
  organization_id text not null default '',
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
  price_list_id uuid,
  price_list_name text not null default '',
  legal_entity_ids jsonb not null default '[]'::jsonb,
  legal_entity_names jsonb not null default '[]'::jsonb,
  source_file text not null default '',
  allowed_user_ids jsonb not null default '[]'::jsonb,
  allowed_companies jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_price_lists (
  id uuid primary key default gen_random_uuid(),
  legacy_price_list_id text unique,
  organization_id text not null default '',
  supplier_id uuid references public.suppliers(id) on delete set null,
  supplier_name text not null,
  price_name text not null default '',
  uploaded_at timestamptz not null default now(),
  active boolean not null default true,
  comment text not null default '',
  source_file text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_price_list_legal_entities (
  id uuid primary key default gen_random_uuid(),
  legacy_price_list_legal_id text unique,
  price_list_id uuid not null references public.supplier_price_lists(id) on delete cascade,
  organization_id text not null default '',
  legal_entity_id text not null,
  legal_entity_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.supplier_price_items (
  id uuid primary key default gen_random_uuid(),
  legacy_price_item_id text unique,
  price_list_id uuid not null references public.supplier_price_lists(id) on delete cascade,
  organization_id text not null default '',
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  name_in_price text not null default '',
  price numeric(12,2) not null default 0,
  unit_id text not null default '',
  source_row_number integer not null default 0,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
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

create table if not exists public.supplier_import_templates (
  id uuid primary key default gen_random_uuid(),
  supplier_name text not null,
  supplier_legacy_key text,
  sheet_name text not null default '',
  header_row integer not null default 0,
  data_start_row integer not null default 1,
  column_mapping jsonb not null default '{}'::jsonb,
  skip_rules jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.price_import_batches (
  id uuid primary key default gen_random_uuid(),
  supplier_name text not null,
  supplier_legacy_key text,
  template_id uuid references public.supplier_import_templates(id) on delete set null,
  source_file_name text not null default '',
  sheet_name text not null default '',
  total_rows integer not null default 0,
  imported_rows integer not null default 0,
  skipped_rows integer not null default 0,
  status text not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.price_import_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.price_import_batches(id) on delete cascade,
  supplier_name text not null,
  source_row_number integer not null default 0,
  name text not null default '',
  unit text not null default 'кг',
  price numeric(12,2) not null default 0,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.restaurants add column if not exists organization_id text not null default '';
alter table public.suppliers add column if not exists organization_id text not null default '';
alter table public.products add column if not exists organization_id text not null default '';
alter table public.product_supplier_prices add column if not exists organization_id text not null default '';
alter table public.product_supplier_prices add column if not exists price_list_id uuid;
alter table public.product_supplier_prices add column if not exists price_list_name text not null default '';
alter table public.product_supplier_prices add column if not exists legal_entity_ids jsonb not null default '[]'::jsonb;
alter table public.product_supplier_prices add column if not exists legal_entity_names jsonb not null default '[]'::jsonb;
alter table public.product_supplier_prices add column if not exists source_file text not null default '';
alter table public.orders add column if not exists organization_id text not null default '';
alter table public.tech_cards add column if not exists organization_id text not null default '';
alter table public.supplier_import_templates add column if not exists organization_id text not null default '';
alter table public.price_import_batches add column if not exists organization_id text not null default '';
alter table public.price_import_items add column if not exists organization_id text not null default '';
alter table public.supplier_price_lists add column if not exists organization_id text not null default '';
alter table public.supplier_price_list_legal_entities add column if not exists organization_id text not null default '';
alter table public.supplier_price_items add column if not exists organization_id text not null default '';

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
  price_list_row jsonb;
  price_list_legal_row jsonb;
  price_item_row jsonb;
  order_row jsonb;
  tech_card_row jsonb;
  product_uuid uuid;
  supplier_uuid uuid;
  price_list_uuid uuid;
  supplier_name_value text;
  product_name_value text;
  price_list_name_value text;
begin
  delete from public.product_supplier_prices;
  delete from public.supplier_price_items;
  delete from public.supplier_price_list_legal_entities;
  delete from public.supplier_price_lists;
  delete from public.price_import_items;
  delete from public.price_import_batches;
  delete from public.supplier_import_templates;
  delete from public.orders;
  delete from public.tech_cards;
  delete from public.restaurants;
  delete from public.products;
  delete from public.suppliers;

  for restaurant_row in select value from jsonb_array_elements(coalesce(snapshot->'restaurants', '[]'::jsonb))
  loop
    insert into public.restaurants (
      legacy_id, organization_id, name, emoji, kind, city, address, members
    ) values (
      nullif(restaurant_row->>'id', ''),
      coalesce(restaurant_row->>'organizationId', restaurant_row->>'organization_id', ''),
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
      legacy_key, organization_id, name, emoji, kind, rating, orders_count, delivery, min_order_text,
      status, tags, contact, phone, hidden
    ) values (
      nullif(supplier_row->>'name', ''),
      coalesce(supplier_row->>'organizationId', supplier_row->>'organization_id', ''),
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
      legacy_product_id, organization_id, name, category, unit, emoji, sticker, favorite,
      p_kg, p_sh, p_l, p_ml, allowed_companies
    ) values (
      nullif(product_row->>'id', ''),
      coalesce(product_row->>'organizationId', product_row->>'organization_id', ''),
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

  for price_list_row in select value from jsonb_array_elements(coalesce(snapshot->'supplierPriceLists', '[]'::jsonb))
  loop
    select id into supplier_uuid from public.suppliers where name = coalesce(price_list_row->>'supplierName', '') limit 1;
    insert into public.supplier_price_lists (
      legacy_price_list_id, organization_id, supplier_id, supplier_name, price_name,
      uploaded_at, active, comment, source_file
    ) values (
      nullif(price_list_row->>'id', ''),
      coalesce(price_list_row->>'organizationId', price_list_row->>'organization_id', ''),
      supplier_uuid,
      coalesce(price_list_row->>'supplierName', ''),
      coalesce(price_list_row->>'priceName', price_list_row->>'name', ''),
      coalesce(nullif(price_list_row->>'uploadedAt', '')::timestamptz, now()),
      coalesce(nullif(price_list_row->>'active', '')::boolean, true),
      coalesce(price_list_row->>'comment', ''),
      coalesce(price_list_row->>'sourceFile', '')
    );
  end loop;

  for price_list_legal_row in select value from jsonb_array_elements(coalesce(snapshot->'supplierPriceListLegals', '[]'::jsonb))
  loop
    select id into price_list_uuid from public.supplier_price_lists where legacy_price_list_id = nullif(price_list_legal_row->>'priceListId', '') limit 1;
    if price_list_uuid is null then
      select id into price_list_uuid from public.supplier_price_lists where id::text = nullif(price_list_legal_row->>'priceListId', '') limit 1;
    end if;
    if price_list_uuid is not null then
      insert into public.supplier_price_list_legal_entities (
        legacy_price_list_legal_id, price_list_id, organization_id, legal_entity_id, legal_entity_name
      ) values (
        nullif(price_list_legal_row->>'id', ''),
        price_list_uuid,
        coalesce(price_list_legal_row->>'organizationId', price_list_legal_row->>'organization_id', ''),
        coalesce(price_list_legal_row->>'legalEntityId', ''),
        coalesce(price_list_legal_row->>'legalEntityName', '')
      );
    end if;
  end loop;

  for price_item_row in select value from jsonb_array_elements(coalesce(snapshot->'supplierPriceItems', '[]'::jsonb))
  loop
    select id into price_list_uuid from public.supplier_price_lists where legacy_price_list_id = nullif(price_item_row->>'priceListId', '') limit 1;
    if price_list_uuid is null then
      select id into price_list_uuid from public.supplier_price_lists where id::text = nullif(price_item_row->>'priceListId', '') limit 1;
    end if;
    if price_list_uuid is not null then
      select id into product_uuid from public.products where name = coalesce(price_item_row->>'productName', price_item_row->>'nameInPrice', '') limit 1;
      insert into public.supplier_price_items (
        legacy_price_item_id, price_list_id, organization_id, product_id, product_name, name_in_price,
        price, unit_id, source_row_number, raw_data
      ) values (
        nullif(price_item_row->>'id', ''),
        price_list_uuid,
        coalesce(price_item_row->>'organizationId', price_item_row->>'organization_id', ''),
        product_uuid,
        coalesce(price_item_row->>'productName', price_item_row->>'nameInPrice', ''),
        coalesce(price_item_row->>'nameInPrice', price_item_row->>'productName', ''),
        coalesce(nullif(price_item_row->>'price', '')::numeric, 0),
        coalesce(price_item_row->>'unitId', ''),
        coalesce(nullif(price_item_row->>'sourceRowNumber', '')::integer, 0),
        coalesce(price_item_row->'rawData', '{}'::jsonb)
      );
    end if;
  end loop;

  for price_import_batch_row in select value from jsonb_array_elements(coalesce(snapshot->'priceImportBatches', '[]'::jsonb))
  loop
    insert into public.price_import_batches (
      organization_id, supplier_name, supplier_legacy_key, template_id, source_file_name,
      sheet_name, total_rows, imported_rows, skipped_rows, status, created_by
    ) values (
      coalesce(price_import_batch_row->>'organizationId', price_import_batch_row->>'organization_id', ''),
      coalesce(price_import_batch_row->>'supplierName', ''),
      coalesce(price_import_batch_row->>'supplierLegacyKey', ''),
      nullif(price_import_batch_row->>'templateId', '')::uuid,
      coalesce(price_import_batch_row->>'sourceFileName', ''),
      coalesce(price_import_batch_row->>'sheetName', ''),
      coalesce(nullif(price_import_batch_row->>'totalRows', '')::integer, 0),
      coalesce(nullif(price_import_batch_row->>'importedRows', '')::integer, 0),
      coalesce(nullif(price_import_batch_row->>'skippedRows', '')::integer, 0),
      coalesce(price_import_batch_row->>'status', 'draft'),
      nullif(price_import_batch_row->>'createdBy', '')::uuid
    );
  end loop;

  for price_import_item_row in select value from jsonb_array_elements(coalesce(snapshot->'priceImportItems', '[]'::jsonb))
  loop
    insert into public.price_import_items (
      batch_id, organization_id, supplier_name, source_row_number, name, unit, price, raw_data
    ) values (
      nullif(price_import_item_row->>'batchId', '')::uuid,
      coalesce(price_import_item_row->>'organizationId', price_import_item_row->>'organization_id', ''),
      coalesce(price_import_item_row->>'supplierName', ''),
      coalesce(nullif(price_import_item_row->>'sourceRowNumber', '')::integer, 0),
      coalesce(price_import_item_row->>'name', ''),
      coalesce(price_import_item_row->>'unit', 'кг'),
      coalesce(nullif(price_import_item_row->>'price', '')::numeric, 0),
      coalesce(price_import_item_row->'rawData', '{}'::jsonb)
    );
  end loop;

  for price_list_row in select value from jsonb_array_elements(coalesce(snapshot->'supplierImportTemplates', '[]'::jsonb))
  loop
    insert into public.supplier_import_templates (
      organization_id, supplier_name, supplier_legacy_key, sheet_name, header_row, data_start_row,
      column_mapping, skip_rules, created_by
    ) values (
      coalesce(price_list_row->>'organizationId', price_list_row->>'organization_id', ''),
      coalesce(price_list_row->>'supplierName', ''),
      coalesce(price_list_row->>'supplierLegacyKey', ''),
      coalesce(price_list_row->>'sheetName', ''),
      coalesce(nullif(price_list_row->>'headerRow', '')::integer, 0),
      coalesce(nullif(price_list_row->>'dataStartRow', '')::integer, 1),
      coalesce(price_list_row->'columnMapping', '{}'::jsonb),
      coalesce(price_list_row->'skipRules', '{}'::jsonb),
      nullif(price_list_row->>'createdBy', '')::uuid
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
      legacy_sup_prod_id, organization_id, product_id, supplier_id, supplier_name, product_name, category,
      unit, price, p_kg, p_sh, p_l, p_ml, stock, active, hidden, price_name,
      price_type, price_list_id, price_list_name, legal_entity_ids, legal_entity_names, source_file,
      allowed_user_ids, allowed_companies
    ) values (
      nullif(sup_prod_row->>'id', ''),
      coalesce(sup_prod_row->>'organizationId', sup_prod_row->>'organization_id', ''),
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
      nullif(sup_prod_row->>'priceListId', ''),
      coalesce(sup_prod_row->>'priceListName', ''),
      coalesce(sup_prod_row->'legalEntityIds', '[]'::jsonb),
      coalesce(sup_prod_row->'legalEntityNames', '[]'::jsonb),
      coalesce(sup_prod_row->>'sourceFile', ''),
      coalesce(sup_prod_row->'allowedUserIds', '[]'::jsonb),
      coalesce(sup_prod_row->'allowedCompanies', '[]'::jsonb)
    );
  end loop;

  for order_row in select value from jsonb_array_elements(coalesce(snapshot->'orders', '[]'::jsonb))
  loop
    insert into public.orders (
      legacy_order_id, organization_id, restaurant_name, supplier_name, supplier_label,
      items_text, total, order_date, status, comment
    ) values (
      nullif(order_row->>'id', ''),
      coalesce(order_row->>'organizationId', order_row->>'organization_id', ''),
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
      legacy_tech_card_id, organization_id, name, category, input_g, loss_p, yield_g, markup, ingredients
    ) values (
      nullif(tech_card_row->>'id', ''),
      coalesce(tech_card_row->>'organizationId', tech_card_row->>'organization_id', ''),
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

alter table public.supplier_import_templates enable row level security;
alter table public.price_import_batches enable row level security;
alter table public.price_import_items enable row level security;
alter table public.supplier_price_lists enable row level security;
alter table public.supplier_price_list_legal_entities enable row level security;
alter table public.supplier_price_items enable row level security;

drop policy if exists "supplier_import_templates_rw_authenticated" on public.supplier_import_templates;
create policy "supplier_import_templates_rw_authenticated"
on public.supplier_import_templates
for all to authenticated
using (true)
with check (true);

drop policy if exists "price_import_batches_rw_authenticated" on public.price_import_batches;
create policy "price_import_batches_rw_authenticated"
on public.price_import_batches
for all to authenticated
using (true)
with check (true);

drop policy if exists "price_import_items_rw_authenticated" on public.price_import_items;
create policy "price_import_items_rw_authenticated"
on public.price_import_items
for all to authenticated
using (true)
with check (true);

drop policy if exists "supplier_price_lists_rw_authenticated" on public.supplier_price_lists;
create policy "supplier_price_lists_rw_authenticated"
on public.supplier_price_lists
for all to authenticated
using (true)
with check (true);

drop policy if exists "supplier_price_list_legals_rw_authenticated" on public.supplier_price_list_legal_entities;
create policy "supplier_price_list_legals_rw_authenticated"
on public.supplier_price_list_legal_entities
for all to authenticated
using (true)
with check (true);

drop policy if exists "supplier_price_items_rw_authenticated" on public.supplier_price_items;
create policy "supplier_price_items_rw_authenticated"
on public.supplier_price_items
for all to authenticated
using (true)
with check (true);
