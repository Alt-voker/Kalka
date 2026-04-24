-- Run only after manual confirmation.
-- This script assigns a chosen organization_id to old legacy rows.
-- It does not delete or replace any data.

-- Replace the UUID below with the target organization_id before running.
do $$
declare
  target_org_id uuid := null;
begin
  if target_org_id is null then
    raise exception 'target_org_id must be set before running this script';
  end if;

  update public.restaurants set organization_id = target_org_id where organization_id is null;
  update public.suppliers set organization_id = target_org_id where organization_id is null;
  update public.products set organization_id = target_org_id where organization_id is null;
  update public.product_supplier_prices set organization_id = target_org_id where organization_id is null;
  update public.orders set organization_id = target_org_id where organization_id is null;
  update public.tech_cards set organization_id = target_org_id where organization_id is null;
end
$$;

