alter table public.users
  add column if not exists session_version integer not null default 1;

create table if not exists public.auth_rate_limits (
  key_hash varchar(64) primary key,
  attempt_count integer not null default 0,
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists auth_rate_limits_updated_at_idx
  on public.auth_rate_limits (updated_at);

alter table public.auth_rate_limits enable row level security;

create policy "auth_rate_limits_no_direct_access"
  on public.auth_rate_limits
  for all
  using (false)
  with check (false);

grant select, insert, update, delete on table public.auth_rate_limits to zuhiera_app;
