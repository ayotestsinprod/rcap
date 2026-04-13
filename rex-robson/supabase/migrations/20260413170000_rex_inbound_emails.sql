-- Inbound mail Rex receives (forward / CC). Ingestion populates these tables via a future webhook or worker.

create table public.rex_inbound_emails (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  from_name text,
  from_address text not null,
  to_addresses text[] not null default '{}',
  subject text not null default '',
  body_text text,
  body_html text,
  snippet text,
  external_message_id text unique,
  raw_headers jsonb
);

comment on table public.rex_inbound_emails is 'Email messages visible to Rex; surfaced in the workspace Emails view.';
comment on column public.rex_inbound_emails.external_message_id is 'Provider message id for deduplication on ingest.';

create index rex_inbound_emails_received_at_idx
  on public.rex_inbound_emails (received_at desc);

create table public.rex_inbound_email_attachments (
  id uuid primary key default gen_random_uuid(),
  email_id uuid not null references public.rex_inbound_emails (id) on delete cascade,
  created_at timestamptz not null default now(),
  filename text not null,
  content_type text,
  size_bytes bigint,
  storage_bucket text,
  storage_path text
);

comment on table public.rex_inbound_email_attachments is 'Attachment metadata; binary in Supabase Storage when storage_bucket/path are set.';
comment on column public.rex_inbound_email_attachments.storage_path is 'Object path within storage_bucket.';

create index rex_inbound_email_attachments_email_id_idx
  on public.rex_inbound_email_attachments (email_id);

alter table public.rex_inbound_emails enable row level security;
alter table public.rex_inbound_email_attachments enable row level security;

create policy "rex_inbound_emails_authenticated_all"
  on public.rex_inbound_emails
  for all
  to authenticated
  using (true)
  with check (true);

create policy "rex_inbound_email_attachments_authenticated_all"
  on public.rex_inbound_email_attachments
  for all
  to authenticated
  using (true)
  with check (true);

-- Optional bucket for attachment bytes (ingest uploads here).
insert into storage.buckets (id, name, public)
values ('rex-email-attachments', 'rex-email-attachments', false)
on conflict (id) do nothing;

create policy "rex_email_attachments_select_authenticated"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'rex-email-attachments');
