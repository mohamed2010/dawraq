create table if not exists public.clinician_share_reports (
  id serial primary key,
  user_id integer not null references public.users(id) on delete cascade,
  token_hash varchar(64) not null unique,
  report_json text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists clinician_share_reports_user_created_idx
  on public.clinician_share_reports (user_id, created_at desc);

alter table public.clinician_share_reports enable row level security;

create policy "clinician_share_reports_no_direct_access"
  on public.clinician_share_reports
  for all
  using (false)
  with check (false);
