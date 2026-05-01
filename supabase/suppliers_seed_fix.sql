begin;

with chosen_org as (
  select o.id
  from public.organizations o
  where coalesce(o.status, 'active') = 'active'
  order by case when lower(coalesce(o.name, '')) = lower('Тестовая организация') then 0 else 1 end,
           o.created_at asc,
           o.id asc
  limit 1
)
update public.suppliers s
   set organization_id = coalesce(s.organization_id, (select id from chosen_org)),
       status = coalesce(nullif(lower(trim(coalesce(s.status, ''))), ''), 'active'),
       updated_at = now()
 where s.organization_id is null
    or coalesce(nullif(trim(s.status), ''), '') = '';

commit;
