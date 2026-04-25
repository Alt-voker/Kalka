create or replace function public._ensure_user_profile_from_identity(
  p_auth_user_id uuid,
  p_email text default null,
  p_first_name text default null,
  p_last_name text default null,
  p_phone text default null,
  p_status text default null
)
returns public.user_profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.user_profiles%rowtype;
  v_auth_user auth.users%rowtype;
  v_email text;
  v_first_name text;
  v_last_name text;
  v_phone text;
  v_status text;
  v_meta jsonb;
begin
  if p_auth_user_id is null then
    raise exception 'auth_user_id is required';
  end if;

  select *
    into v_profile
  from public.user_profiles
  where auth_user_id = p_auth_user_id
  limit 1;

  if found then
    update public.user_profiles
       set email = case
                     when coalesce(nullif(trim(lower(coalesce(p_email, ''))), ''), '') <> '' then lower(trim(p_email))
                     else email
                   end,
           first_name = coalesce(nullif(trim(p_first_name), ''), first_name),
           last_name = coalesce(nullif(trim(p_last_name), ''), last_name),
           phone = coalesce(nullif(trim(p_phone), ''), phone),
           status = coalesce(nullif(trim(p_status), ''), status),
           updated_at = now()
     where id = v_profile.id
     returning * into v_profile;
    return v_profile;
  end if;

  select u.*
    into v_auth_user
  from auth.users u
  where u.id = p_auth_user_id
  limit 1;

  v_meta := coalesce(v_auth_user.raw_user_meta_data, '{}'::jsonb);
  v_email := lower(coalesce(nullif(trim(coalesce(p_email, v_auth_user.email, '')), ''), ''));
  if v_email = '' then
    raise exception 'email is required to create user profile';
  end if;

  v_first_name := coalesce(nullif(trim(coalesce(p_first_name, v_meta ->> 'first_name', v_meta ->> 'firstName', v_meta ->> 'name', '')), ''), 'Пользователь');
  v_last_name := coalesce(nullif(trim(coalesce(p_last_name, v_meta ->> 'last_name', v_meta ->> 'lastName', '')), ''), '');
  v_phone := coalesce(nullif(trim(coalesce(p_phone, v_meta ->> 'phone', '')), ''), '');
  v_status := coalesce(nullif(trim(coalesce(p_status, 'active')), ''), 'active');

  insert into public.user_profiles (
    auth_user_id,
    email,
    first_name,
    last_name,
    phone,
    status
  ) values (
    p_auth_user_id,
    v_email,
    v_first_name,
    v_last_name,
    v_phone,
    v_status
  )
  returning * into v_profile;

  return v_profile;
end;
$$;

revoke all on function public._ensure_user_profile_from_identity(uuid, text, text, text, text, text) from public;

create or replace function public.ensure_user_profile()
returns table (
  profile_id uuid,
  auth_user_id uuid,
  email text,
  first_name text,
  last_name text,
  status text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.user_profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth.uid() is required';
  end if;

  v_profile := public._ensure_user_profile_from_identity(auth.uid(), null, null, null, null, null);

  return query
  select
    v_profile.id,
    v_profile.auth_user_id,
    v_profile.email,
    v_profile.first_name,
    v_profile.last_name,
    v_profile.status;
end;
$$;

revoke all on function public.ensure_user_profile() from public;
grant execute on function public.ensure_user_profile() to authenticated;

create or replace function public._is_platform_owner()
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.user_profiles up
    join public.organization_members om on om.user_profile_id = up.id
    where up.auth_user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('platform_owner', 'owner')
  );
$$;

revoke all on function public._is_platform_owner() from public;

create or replace function public.get_my_session()
returns table (
  profile_id uuid,
  auth_user_id uuid,
  email text,
  first_name text,
  last_name text,
  status text,
  memberships jsonb,
  organizations jsonb,
  active_organization_id uuid,
  active_organization_name text,
  role text,
  no_organization boolean,
  error_message text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.user_profiles%rowtype;
  v_memberships jsonb;
  v_organizations jsonb;
  v_active_org_id uuid;
  v_active_org_name text;
  v_role text := 'unassigned';
begin
  if auth.uid() is null then
    raise exception 'auth.uid() is required';
  end if;

  v_profile := public._ensure_user_profile_from_identity(auth.uid(), null, null, null, null, null);

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', om.id,
             'organization_id', om.organization_id,
             'user_profile_id', om.user_profile_id,
             'role', om.role,
             'status', om.status,
             'created_at', om.created_at,
             'updated_at', om.updated_at
           )
           order by om.created_at asc
         ), '[]'::jsonb)
    into v_memberships
  from public.organization_members om
  where om.user_profile_id = v_profile.id
    and om.status = 'active';

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', o.id,
             'name', o.name,
             'type', o.type,
             'status', o.status,
             'created_at', o.created_at,
             'updated_at', o.updated_at
           )
           order by o.created_at asc
         ), '[]'::jsonb)
    into v_organizations
  from public.organization_members om
  join public.organizations o on o.id = om.organization_id
  where om.user_profile_id = v_profile.id
    and om.status = 'active'
    and o.status = 'active';

  select o.id, o.name, om.role
    into v_active_org_id, v_active_org_name, v_role
  from public.organization_members om
  join public.organizations o on o.id = om.organization_id
  where om.user_profile_id = v_profile.id
    and om.status = 'active'
    and o.status = 'active'
  order by om.created_at asc
  limit 1;

  if coalesce(jsonb_array_length(v_memberships), 0) > 0 and coalesce(jsonb_array_length(v_organizations), 0) = 0 then
    v_error_message := 'Не удалось загрузить организации пользователя';
  end if;

  return query
  select
    v_profile.id,
    v_profile.auth_user_id,
    v_profile.email,
    v_profile.first_name,
    v_profile.last_name,
    v_profile.status,
    coalesce(v_memberships, '[]'::jsonb),
    coalesce(v_organizations, '[]'::jsonb),
    v_active_org_id,
    v_active_org_name,
    coalesce(v_role, 'unassigned'),
    case when v_active_org_id is null then true else false end,
    v_error_message;
end;
$$;

revoke all on function public.get_my_session() from public;
grant execute on function public.get_my_session() to authenticated;

create or replace function public.owner_list_users()
returns table (
  profile_id uuid,
  auth_user_id uuid,
  email text,
  first_name text,
  last_name text,
  status text,
  created_at timestamptz,
  role text,
  no_organization boolean,
  memberships jsonb,
  organizations jsonb
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public._is_platform_owner() then
    raise exception 'Forbidden';
  end if;

  return query
  select
    up.id as profile_id,
    up.auth_user_id,
    up.email,
    up.first_name,
    up.last_name,
    up.status,
    up.created_at,
    coalesce((
      select om.role
      from public.organization_members om
      where om.user_profile_id = up.id
        and om.status = 'active'
      order by om.created_at asc
      limit 1
    ), 'unassigned') as role,
    case when exists (
      select 1
      from public.organization_members om
      where om.user_profile_id = up.id
        and om.status = 'active'
    ) then false else true end as no_organization,
    coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id', om.id,
                 'organization_id', om.organization_id,
                 'user_profile_id', om.user_profile_id,
                 'role', om.role,
                 'status', om.status,
                 'created_at', om.created_at,
                 'updated_at', om.updated_at
               )
               order by om.created_at asc
             )
      from public.organization_members om
      where om.user_profile_id = up.id
    ), '[]'::jsonb) as memberships,
    coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id', o.id,
                 'name', o.name,
                 'type', o.type,
                 'status', o.status,
                 'created_at', o.created_at,
                 'updated_at', o.updated_at
               )
               order by o.created_at asc
             )
      from public.organization_members om
      join public.organizations o on o.id = om.organization_id
      where om.user_profile_id = up.id
        and om.status = 'active'
    ), '[]'::jsonb) as organizations
  from public.user_profiles up
  order by up.created_at desc;
end;
$$;

revoke all on function public.owner_list_users() from public;
grant execute on function public.owner_list_users() to authenticated;

create or replace function public.owner_assign_user_to_organization(
  target_user_profile_id uuid,
  target_auth_user_id uuid,
  target_email text,
  target_organization_id uuid,
  target_role text
)
returns table (
  membership_id uuid,
  user_profile_id uuid,
  auth_user_id uuid,
  email text,
  first_name text,
  last_name text,
  organization_id uuid,
  organization_name text,
  role text,
  status text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.user_profiles%rowtype;
  v_membership public.organization_members%rowtype;
  v_org public.organizations%rowtype;
  v_profile_found boolean := false;
  v_auth_user_id uuid := target_auth_user_id;
  v_email text := lower(coalesce(nullif(trim(target_email), ''), ''));
  v_first_name text := 'Пользователь';
  v_last_name text := '';
  v_status text := 'active';
begin
  if not public._is_platform_owner() then
    raise exception 'Forbidden';
  end if;
  if target_organization_id is null then
    raise exception 'organization_id is required';
  end if;
  if coalesce(nullif(trim(target_role), ''), '') = '' then
    raise exception 'role is required';
  end if;

  select * into v_org
  from public.organizations
  where id = target_organization_id
  limit 1;
  if not found then
    raise exception 'organization not found';
  end if;

  if target_user_profile_id is not null then
    select * into v_profile
    from public.user_profiles
    where id = target_user_profile_id
    limit 1;
    v_profile_found := found;
  end if;

  if not v_profile_found and v_auth_user_id is not null then
    select * into v_profile
    from public.user_profiles
    where auth_user_id = v_auth_user_id
    limit 1;
    v_profile_found := found;
  end if;

  if not v_profile_found and v_email <> '' then
    select * into v_profile
    from public.user_profiles
    where lower(email) = v_email
    limit 1;
    v_profile_found := found;
  end if;

  if not v_profile_found then
    if v_auth_user_id is null and v_email = '' then
      raise exception 'Пользователь не найден';
    end if;
    if v_auth_user_id is null and v_email <> '' then
      select u.id, u.email, coalesce(u.raw_user_meta_data ->> 'first_name', u.raw_user_meta_data ->> 'firstName', u.raw_user_meta_data ->> 'name', 'Пользователь')
        into v_auth_user_id, v_email, v_first_name
      from auth.users u
      where lower(u.email) = v_email
      limit 1;
      if v_auth_user_id is null then
        raise exception 'Не удалось найти пользователя в auth.users';
      end if;
      select coalesce(u.raw_user_meta_data ->> 'last_name', u.raw_user_meta_data ->> 'lastName', '')
        into v_last_name
      from auth.users u
      where u.id = v_auth_user_id;
    end if;
    if v_auth_user_id is not null then
      select u.email, coalesce(u.raw_user_meta_data ->> 'first_name', u.raw_user_meta_data ->> 'firstName', u.raw_user_meta_data ->> 'name', 'Пользователь')
        into v_email, v_first_name
      from auth.users u
      where u.id = v_auth_user_id;
      if v_email is null or v_email = '' then
        v_email := lower(coalesce(nullif(trim(target_email), ''), ''));
      else
        v_email := lower(v_email);
      end if;
      select coalesce(u.raw_user_meta_data ->> 'last_name', u.raw_user_meta_data ->> 'lastName', '')
        into v_last_name
      from auth.users u
      where u.id = v_auth_user_id;
    end if;
    v_profile := public._ensure_user_profile_from_identity(
      v_auth_user_id,
      v_email,
      v_first_name,
      v_last_name,
      null,
      'active'
    );
    v_profile_found := true;
  end if;

  update public.user_profiles
     set status = 'active',
         updated_at = now()
   where id = v_profile.id
   returning * into v_profile;

  update public.organization_members
     set role = target_role,
         status = 'active',
         updated_at = now()
   where organization_id = target_organization_id
     and user_profile_id = v_profile.id
   returning * into v_membership;

  if not found then
    insert into public.organization_members (
      organization_id,
      user_profile_id,
      role,
      status
    ) values (
      target_organization_id,
      v_profile.id,
      target_role,
      'active'
    )
    returning * into v_membership;
  end if;

  select *
    into v_membership
  from public.organization_members
  where organization_id = target_organization_id
    and user_profile_id = v_profile.id
  limit 1;

  if not found then
    raise exception 'Не удалось добавить пользователя в организацию';
  end if;

  return query
  select
    v_membership.id,
    v_profile.id,
    v_profile.auth_user_id,
    v_profile.email,
    v_profile.first_name,
    v_profile.last_name,
    v_org.id,
    v_org.name,
    v_membership.role,
    v_membership.status;
end;
$$;

revoke all on function public.owner_assign_user_to_organization(uuid, uuid, text, uuid, text) from public;
grant execute on function public.owner_assign_user_to_organization(uuid, uuid, text, uuid, text) to authenticated;

create or replace function public.owner_update_user_role(
  target_user_profile_id uuid,
  target_organization_id uuid,
  target_role text
)
returns table (
  membership_id uuid,
  user_profile_id uuid,
  organization_id uuid,
  role text,
  status text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_membership public.organization_members%rowtype;
begin
  if not public._is_platform_owner() then
    raise exception 'Forbidden';
  end if;
  if target_user_profile_id is null or target_organization_id is null then
    raise exception 'profile and organization are required';
  end if;
  if coalesce(nullif(trim(target_role), ''), '') = '' then
    raise exception 'role is required';
  end if;

  update public.user_profiles
     set status = 'active',
         updated_at = now()
   where id = target_user_profile_id;

  update public.organization_members
     set role = target_role,
         status = 'active',
         updated_at = now()
   where organization_id = target_organization_id
     and user_profile_id = target_user_profile_id
   returning * into v_membership;

  if not found then
    raise exception 'Не удалось сохранить роль пользователя';
  end if;

  select *
    into v_membership
  from public.organization_members
  where organization_id = target_organization_id
    and user_profile_id = target_user_profile_id
  limit 1;

  if not found then
    raise exception 'Не удалось сохранить роль пользователя';
  end if;

  return query
  select v_membership.id, v_membership.user_profile_id, v_membership.organization_id, v_membership.role, v_membership.status;
end;
$$;

revoke all on function public.owner_update_user_role(uuid, uuid, text) from public;
grant execute on function public.owner_update_user_role(uuid, uuid, text) to authenticated;

create or replace function public.owner_remove_user_from_organization(
  target_user_profile_id uuid,
  target_organization_id uuid
)
returns table (
  membership_id uuid,
  user_profile_id uuid,
  organization_id uuid,
  role text,
  status text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_membership public.organization_members%rowtype;
begin
  if not public._is_platform_owner() then
    raise exception 'Forbidden';
  end if;
  if target_user_profile_id is null or target_organization_id is null then
    raise exception 'profile and organization are required';
  end if;

  update public.organization_members
     set status = 'inactive',
         updated_at = now()
   where organization_id = target_organization_id
     and user_profile_id = target_user_profile_id
   returning * into v_membership;

  if not found then
    raise exception 'Не удалось удалить пользователя из организации';
  end if;

  return query
  select v_membership.id, v_membership.user_profile_id, v_membership.organization_id, v_membership.role, v_membership.status;
end;
$$;

revoke all on function public.owner_remove_user_from_organization(uuid, uuid) from public;
grant execute on function public.owner_remove_user_from_organization(uuid, uuid) to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public._ensure_user_profile_from_identity(
    new.id,
    lower(coalesce(new.email, '')),
    coalesce(new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'firstName', new.raw_user_meta_data ->> 'name', 'Пользователь'),
    coalesce(new.raw_user_meta_data ->> 'last_name', new.raw_user_meta_data ->> 'lastName', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    'pending'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
