-- The tracker only accesses Postgres through server-side Drizzle queries.
-- Keep the helper private so it cannot be invoked through the public REST RPC surface.
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
