-- Suggestions Rex surfaces to the user (e.g. follow-ups, intros). Pending = still waiting for action.

create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  title text,
  body text,
  status text not null default 'pending'
    check (status in ('pending', 'dismissed', 'acted')),
  created_at timestamptz not null default now()
);

comment on table public.suggestions is 'Action items or ideas for the user; Rex counts pending rows for the opening greeting.';

alter table public.suggestions enable row level security;

create policy "suggestions_authenticated_all"
  on public.suggestions
  for all
  to authenticated
  using (true)
  with check (true);
