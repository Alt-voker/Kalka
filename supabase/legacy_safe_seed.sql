do $$
declare
  owner_user_id uuid := null; -- replace before running
  owner_profile_id uuid;
  org_id uuid := '11111111-1111-1111-1111-111111111111';
  legal_entity_id uuid := '22222222-2222-2222-2222-222222222222';
begin
  insert into public.organizations (id, name, type, status)
  values (org_id, 'Тестовая организация', 'restaurant', 'active')
  on conflict (id) do nothing;

  insert into public.legal_entities (id, organization_id, name, inn, kpp, ogrn, legal_address, status)
  values (legal_entity_id, org_id, 'ООО «Тестовое юрлицо»', '0000000000', '000000000', '0000000000000', 'Россия, Москва', 'active')
  on conflict (id) do nothing;

  if owner_user_id is null then
    raise exception 'owner_user_id must be replaced with a real auth.users.id before running the seed';
  end if;

  insert into public.user_profiles (auth_user_id, email, first_name, last_name, phone, status)
  values (owner_user_id, 'owner@kalka.local', 'Owner', 'Platform', '', 'active')
  on conflict (auth_user_id) do update
  set email = excluded.email,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      status = excluded.status,
      updated_at = now()
  returning id into owner_profile_id;

  insert into public.organization_members (organization_id, user_profile_id, role, status)
  values (org_id, owner_profile_id, 'organization_owner', 'active')
  on conflict (organization_id, user_profile_id) do nothing;

  insert into public.member_legal_entities (organization_member_id, legal_entity_id)
  select om.id, legal_entity_id
  from public.organization_members om
  where om.organization_id = org_id
    and om.user_profile_id = owner_profile_id
  on conflict (organization_member_id, legal_entity_id) do nothing;

  insert into public.suppliers (organization_id, name, inn, phone, email, contact_person, comment, status)
  values (org_id, 'Тестовый поставщик', '0000000000', '+7 (000) 000-00-00', 'supplier@kalka.local', 'Контакт', 'Seed supplier for baseline checks', 'active')
  on conflict (organization_id, name) do nothing;
end
$$;

