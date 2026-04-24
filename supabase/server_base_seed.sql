-- Stable server seed for the new Supabase-only foundation of "КальКа".
-- This seed does not use localStorage, Firebase fallback or legacy app_state.
-- It seeds only the normalized PostgreSQL layer.

-- If you want the platform owner to be a real auth user immediately,
-- create the user in Supabase Auth first, then update the auth_user_id below
-- to the created auth.users.id value before running this file.

do $$
declare
  owner_user_id uuid := '11111111-1111-1111-1111-111111111111';
  platform_org_id uuid := '22222222-2222-2222-2222-222222222222';
  test_org_id uuid := '33333333-3333-3333-3333-333333333333';
  test_legal_entity_id uuid := '44444444-4444-4444-4444-444444444444';
  test_supplier_id uuid := '55555555-5555-5555-5555-555555555555';
  owner_profile_id uuid := '66666666-6666-6666-6666-666666666666';
begin
  insert into public.organizations (id, name, type, status)
  values
    (platform_org_id, 'КальКа Platform', 'platform', 'active'),
    (test_org_id, 'Тестовая организация', 'restaurant', 'active')
  on conflict (id) do nothing;

  insert into public.legal_entities (id, organization_id, name, inn, kpp, ogrn, legal_address, status)
  values
    (test_legal_entity_id, test_org_id, 'ООО «Тестовое юрлицо»', '0000000000', '000000000', '0000000000000', 'Россия, Москва', 'active')
  on conflict (id) do nothing;

  insert into public.user_profiles (id, auth_user_id, email, first_name, last_name, phone, status)
  values
    (owner_profile_id, owner_user_id, 'owner@kalka.local', 'Owner', 'Platform', '', 'active')
  on conflict (id) do nothing;

  insert into public.organization_members (id, organization_id, user_profile_id, role, status)
  values
    ('77777777-7777-7777-7777-777777777777', platform_org_id, owner_profile_id, 'platform_owner', 'active')
  on conflict (id) do nothing;

  insert into public.member_legal_entities (id, organization_member_id, legal_entity_id)
  values
    ('88888888-8888-8888-8888-888888888888', '77777777-7777-7777-7777-777777777777', test_legal_entity_id)
  on conflict (id) do nothing;

  insert into public.suppliers (id, organization_id, name, inn, phone, email, contact_person, comment, status)
  values
    (test_supplier_id, test_org_id, 'Тестовый поставщик', '0000000000', '+7 (000) 000-00-00', 'supplier@kalka.local', 'Контакт', 'Seed supplier for baseline checks', 'active')
  on conflict (id) do nothing;

  insert into public.audit_logs (organization_id, user_profile_id, action, entity_type, entity_id, details)
  values
    (test_org_id, owner_profile_id, 'seed_create', 'organization', test_org_id::text, jsonb_build_object('note', 'Seeded baseline organization')),
    (test_org_id, owner_profile_id, 'seed_create', 'legal_entity', test_legal_entity_id::text, jsonb_build_object('note', 'Seeded baseline legal entity')),
    (test_org_id, owner_profile_id, 'seed_create', 'supplier', test_supplier_id::text, jsonb_build_object('note', 'Seeded baseline supplier'))
  on conflict do nothing;
end
$$;

