-- Persisted Arabic/English interface preference for each isolated user profile.
alter table public.user_profiles add column if not exists language varchar(5) not null default 'ar';
alter table public.user_profiles drop constraint if exists user_profiles_language_check;
alter table public.user_profiles add constraint user_profiles_language_check check (language in ('ar', 'en'));
