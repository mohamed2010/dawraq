-- Local account credentials are stored as salted password hashes only.
-- Existing OAuth-era rows remain intact but cannot be auto-converted because
-- their passwords were never stored by this app. New local registrations
-- require a unique email address and a password hash created by the server.
alter table public.users
  add column if not exists password_hash text;

create unique index if not exists users_email_lower_unique
  on public.users (lower(email))
  where email is not null;
