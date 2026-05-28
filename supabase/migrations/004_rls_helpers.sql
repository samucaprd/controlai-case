CREATE OR REPLACE FUNCTION public.current_empresa_id()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.perfis WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.perfis WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_master()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role = 'master'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.current_empresa_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_master() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_tenant_admin() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_empresa_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_master() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin() TO authenticated;
