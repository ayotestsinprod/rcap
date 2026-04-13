create table public.rex_tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  detail text,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'done', 'dismissed')),
  source text not null default 'manual'
    check (source in ('manual', 'meeting_note', 'email', 'import')),
  due_at timestamptz
);

comment on table public.rex_tasks is 'Rex-owned execution tasks queued by users or generated from ingest flows.';

create index rex_tasks_created_at_idx
  on public.rex_tasks (created_at desc);

create index rex_tasks_status_idx
  on public.rex_tasks (status);

create or replace function public.rex_tasks_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger rex_tasks_set_updated_at
before update on public.rex_tasks
for each row execute function public.rex_tasks_set_updated_at();

alter table public.rex_tasks enable row level security;

create policy "rex_tasks_authenticated_all"
  on public.rex_tasks
  for all
  to authenticated
  using (true)
  with check (true);
