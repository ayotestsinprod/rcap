-- Paginated contacts with search across person fields and linked organisation (company) name.

create or replace function public.workspace_contacts_page (
  p_search text,
  p_page int,
  p_page_size int
)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_q text;
  v_page int;
  v_size int;
  v_total bigint;
  v_rows json;
begin
  v_page := greatest(coalesce(p_page, 1), 1);
  v_size := least(greatest(coalesce(p_page_size, 12), 1), 50);
  v_q := nullif(trim(coalesce(p_search, '')), '');

  select count(*)::bigint into v_total
  from public.contacts c
  left join public.organisations o on o.id = c.organisation_id
  where
    v_q is null
    or c.name ilike '%' || v_q || '%'
    or coalesce(c.role, '') ilike '%' || v_q || '%'
    or coalesce(c.notes, '') ilike '%' || v_q || '%'
    or coalesce(c.geography, '') ilike '%' || v_q || '%'
    or coalesce(o.name, '') ilike '%' || v_q || '%';

  select coalesce(json_agg(sub.obj order by sub.ord desc), '[]'::json) into v_rows
  from (
    select
      json_build_object(
        'id', c.id,
        'name', c.name,
        'role', c.role,
        'geography', c.geography,
        'organisation_id', c.organisation_id,
        'organisation_name', o.name
      ) as obj,
      c.created_at as ord
    from public.contacts c
    left join public.organisations o on o.id = c.organisation_id
    where
      v_q is null
      or c.name ilike '%' || v_q || '%'
      or coalesce(c.role, '') ilike '%' || v_q || '%'
      or coalesce(c.notes, '') ilike '%' || v_q || '%'
      or coalesce(c.geography, '') ilike '%' || v_q || '%'
      or coalesce(o.name, '') ilike '%' || v_q || '%'
    order by c.created_at desc
    offset (v_page - 1) * v_size
    limit v_size
  ) sub;

  return json_build_object(
    'total', coalesce(v_total, 0),
    'rows', coalesce(v_rows, '[]'::json)
  );
end;
$$;

comment on function public.workspace_contacts_page (text, int, int) is
  'Paged contact list with ILIKE search on name, role, notes, geography, and organisation name.';

grant execute on function public.workspace_contacts_page (text, int, int) to authenticated;
grant execute on function public.workspace_contacts_page (text, int, int) to service_role;
