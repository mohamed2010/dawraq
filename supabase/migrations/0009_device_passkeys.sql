create table if not exists public.device_passkeys (
  id serial primary key,
  user_id integer not null references public.users(id) on delete cascade,
  credential_id varchar(512) not null unique,
  public_key text not null,
  counter integer not null default 0,
  transports_json text not null default '[]',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists device_passkeys_user_created_idx
  on public.device_passkeys (user_id, created_at desc);

create table if not exists public.webauthn_challenges (
  user_id integer primary key references public.users(id) on delete cascade,
  challenge varchar(512) not null,
  ceremony varchar(20) not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.device_passkeys enable row level security;
alter table public.webauthn_challenges enable row level security;

create policy "device_passkeys_no_direct_access" on public.device_passkeys for all using (false) with check (false);
create policy "webauthn_challenges_no_direct_access" on public.webauthn_challenges for all using (false) with check (false);
