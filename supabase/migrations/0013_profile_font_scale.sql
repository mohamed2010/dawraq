alter table public.user_profiles
  add column if not exists font_scale varchar(12) not null default 'normal';

alter table public.user_profiles
  drop constraint if exists user_profiles_font_scale_check;

alter table public.user_profiles
  add constraint user_profiles_font_scale_check
  check (font_scale in ('normal', 'large', 'extra'));
