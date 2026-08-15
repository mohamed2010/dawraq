-- Extend private tracking with optional cycle flow, health measurements, and fertility observations.
alter table public.user_profiles add column if not exists trying_to_conceive boolean not null default false;

alter table public.cycle_records add column if not exists flow_volume varchar(12) not null default 'medium';
alter table public.cycle_records drop constraint if exists cycle_records_flow_volume_check;
alter table public.cycle_records add constraint cycle_records_flow_volume_check check (flow_volume in ('light', 'medium', 'heavy'));

alter table public.daily_entries add column if not exists custom_symptoms_json text not null default '[]';
alter table public.daily_entries add column if not exists energy_level integer not null default 3;
alter table public.daily_entries add column if not exists weight_kg real;
alter table public.daily_entries add column if not exists basal_temperature real;
alter table public.daily_entries add column if not exists cervical_mucus varchar(16) not null default 'not_observed';
alter table public.daily_entries add column if not exists opk_result varchar(16) not null default 'not_taken';
alter table public.daily_entries add column if not exists pregnancy_test varchar(16) not null default 'not_taken';

alter table public.daily_entries drop constraint if exists daily_entries_energy_level_check;
alter table public.daily_entries add constraint daily_entries_energy_level_check check (energy_level between 1 and 5);
alter table public.daily_entries drop constraint if exists daily_entries_weight_kg_check;
alter table public.daily_entries add constraint daily_entries_weight_kg_check check (weight_kg is null or weight_kg between 20 and 300);
alter table public.daily_entries drop constraint if exists daily_entries_basal_temperature_check;
alter table public.daily_entries add constraint daily_entries_basal_temperature_check check (basal_temperature is null or basal_temperature between 34 and 43);
alter table public.daily_entries drop constraint if exists daily_entries_cervical_mucus_check;
alter table public.daily_entries add constraint daily_entries_cervical_mucus_check check (cervical_mucus in ('not_observed', 'dry', 'sticky', 'creamy', 'watery', 'egg_white'));
alter table public.daily_entries drop constraint if exists daily_entries_opk_result_check;
alter table public.daily_entries add constraint daily_entries_opk_result_check check (opk_result in ('not_taken', 'negative', 'positive', 'unclear'));
alter table public.daily_entries drop constraint if exists daily_entries_pregnancy_test_check;
alter table public.daily_entries add constraint daily_entries_pregnancy_test_check check (pregnancy_test in ('not_taken', 'negative', 'positive', 'unclear'));
