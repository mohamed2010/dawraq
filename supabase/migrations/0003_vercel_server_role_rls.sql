-- The Next.js server is the sole trusted enforcement point for per-user data isolation.
-- Browser-facing Supabase roles remain denied because these policies target only zuhiera_app.
drop policy if exists zuhiera_app_server_access_users on public.users;
drop policy if exists zuhiera_app_server_access_profiles on public.user_profiles;
drop policy if exists zuhiera_app_server_access_cycles on public.cycle_records;
drop policy if exists zuhiera_app_server_access_daily_entries on public.daily_entries;

create policy zuhiera_app_server_access_users
  on public.users for all to zuhiera_app
  using (true) with check (true);

create policy zuhiera_app_server_access_profiles
  on public.user_profiles for all to zuhiera_app
  using (true) with check (true);

create policy zuhiera_app_server_access_cycles
  on public.cycle_records for all to zuhiera_app
  using (true) with check (true);

create policy zuhiera_app_server_access_daily_entries
  on public.daily_entries for all to zuhiera_app
  using (true) with check (true);
