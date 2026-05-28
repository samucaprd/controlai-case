ALTER FUNCTION public.set_updated_at() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_table_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_auditoria(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.current_empresa_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_master() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_tenant_admin() FROM anon;
