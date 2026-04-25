create index if not exists idx_suppliers_org_status_name
on public.suppliers (organization_id, status, name);
