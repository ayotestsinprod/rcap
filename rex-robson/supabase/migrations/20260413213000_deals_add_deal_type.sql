-- Add deal_type to deals and include it in paginated deal RPC/search.

alter table public.deals
  add column if not exists deal_type text;

create or replace function public.workspace_deals_page (
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
  v_size := least(greatest(coalesce(p_page_size, 8), 1), 50);
  v_q := nullif(trim(coalesce(p_search, '')), '');

  select count(*)::bigint into v_total
  from public.deals d
  where
    (d.status is null or d.status not in ('passed', 'closed'))
    and (
      v_q is null
      or d.title ilike '%' || v_q || '%'
      or coalesce(d.deal_type, '') ilike '%' || v_q || '%'
      or coalesce(d.sector, '') ilike '%' || v_q || '%'
      or coalesce(d.structure, '') ilike '%' || v_q || '%'
      or coalesce(d.status, '') ilike '%' || v_q || '%'
      or coalesce(d.notes, '') ilike '%' || v_q || '%'
      or coalesce(d.size::text, '') ilike '%' || v_q || '%'
    );

  select coalesce(json_agg(sub.obj order by sub.ord desc), '[]'::json) into v_rows
  from (
    select
      json_build_object(
        'id', d.id,
        'title', d.title,
        'size', d.size,
        'deal_type', d.deal_type,
        'sector', d.sector,
        'structure', d.structure,
        'status', d.status
      ) as obj,
      d.created_at as ord
    from public.deals d
    where
      (d.status is null or d.status not in ('passed', 'closed'))
      and (
        v_q is null
        or d.title ilike '%' || v_q || '%'
        or coalesce(d.deal_type, '') ilike '%' || v_q || '%'
        or coalesce(d.sector, '') ilike '%' || v_q || '%'
        or coalesce(d.structure, '') ilike '%' || v_q || '%'
        or coalesce(d.status, '') ilike '%' || v_q || '%'
        or coalesce(d.notes, '') ilike '%' || v_q || '%'
        or coalesce(d.size::text, '') ilike '%' || v_q || '%'
      )
    order by d.created_at desc
    offset (v_page - 1) * v_size
    limit v_size
  ) sub;

  return json_build_object(
    'total', coalesce(v_total, 0),
    'rows', coalesce(v_rows, '[]'::json)
  );
end;
$$;

comment on function public.workspace_deals_page (text, int, int) is
  'Paged open-deal list with ILIKE search on title, deal type, sector, structure, status, notes, and size.';
