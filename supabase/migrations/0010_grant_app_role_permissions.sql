-- The Next.js server connects as this role. Direct Supabase clients remain blocked
-- by the RLS policies defined in migrations 0008 and 0009.
grant select, insert, update, delete on table public.device_passkeys to zuhiera_app;
grant select, insert, update, delete on table public.webauthn_challenges to zuhiera_app;
grant select, insert, update, delete on table public.clinician_share_reports to zuhiera_app;

grant usage, select on sequence public.device_passkeys_id_seq to zuhiera_app;
grant usage, select on sequence public.clinician_share_reports_id_seq to zuhiera_app;
