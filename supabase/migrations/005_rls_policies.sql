-- Enable RLS on all tenant tables
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agentes_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uso_recursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

-- planos
CREATE POLICY planos_select_active ON public.planos
  FOR SELECT TO authenticated
  USING (is_active = true OR public.is_master());

CREATE POLICY planos_master_all ON public.planos
  FOR ALL TO authenticated
  USING (public.is_master())
  WITH CHECK (public.is_master());

-- empresas (no direct SELECT for tenant users — use empresas_public view)
CREATE POLICY empresas_master_all ON public.empresas
  FOR ALL TO authenticated
  USING (public.is_master())
  WITH CHECK (public.is_master());

CREATE POLICY empresas_admin_update ON public.empresas
  FOR UPDATE TO authenticated
  USING (id = public.current_empresa_id() AND public.is_tenant_admin())
  WITH CHECK (id = public.current_empresa_id() AND public.is_tenant_admin());

-- perfis
CREATE POLICY perfis_select ON public.perfis
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_master()
    OR (empresa_id = public.current_empresa_id() AND public.is_tenant_admin())
  );

CREATE POLICY perfis_update_self ON public.perfis
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT p.role FROM public.perfis p WHERE p.id = auth.uid()));

CREATE POLICY perfis_admin_manage_users ON public.perfis
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_tenant_admin()
    AND empresa_id = public.current_empresa_id()
    AND role = 'user'
  );

CREATE POLICY perfis_admin_update_users ON public.perfis
  FOR UPDATE TO authenticated
  USING (
    public.is_tenant_admin()
    AND empresa_id = public.current_empresa_id()
    AND role = 'user'
  )
  WITH CHECK (
    public.is_tenant_admin()
    AND empresa_id = public.current_empresa_id()
    AND role = 'user'
  );

CREATE POLICY perfis_admin_delete_users ON public.perfis
  FOR DELETE TO authenticated
  USING (
    public.is_tenant_admin()
    AND empresa_id = public.current_empresa_id()
    AND role = 'user'
  );

CREATE POLICY perfis_master_all ON public.perfis
  FOR ALL TO authenticated
  USING (public.is_master())
  WITH CHECK (public.is_master());

-- agentes_ia
CREATE POLICY agentes_select ON public.agentes_ia
  FOR SELECT TO authenticated
  USING (
    (empresa_id = public.current_empresa_id() AND is_active = true)
    OR public.is_master()
    OR (empresa_id = public.current_empresa_id() AND public.is_tenant_admin())
  );

CREATE POLICY agentes_admin_insert ON public.agentes_ia
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_tenant_admin()
    AND empresa_id = public.current_empresa_id()
  );

CREATE POLICY agentes_admin_update ON public.agentes_ia
  FOR UPDATE TO authenticated
  USING (public.is_tenant_admin() AND empresa_id = public.current_empresa_id())
  WITH CHECK (public.is_tenant_admin() AND empresa_id = public.current_empresa_id());

CREATE POLICY agentes_admin_delete ON public.agentes_ia
  FOR DELETE TO authenticated
  USING (public.is_tenant_admin() AND empresa_id = public.current_empresa_id());

CREATE POLICY agentes_master_all ON public.agentes_ia
  FOR ALL TO authenticated
  USING (public.is_master())
  WITH CHECK (public.is_master());

-- conversas
CREATE POLICY conversas_select ON public.conversas
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_master()
    OR (empresa_id = public.current_empresa_id() AND public.is_tenant_admin())
  );

CREATE POLICY conversas_insert ON public.conversas
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND empresa_id = public.current_empresa_id()
  );

CREATE POLICY conversas_update_own ON public.conversas
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND empresa_id = public.current_empresa_id())
  WITH CHECK (user_id = auth.uid() AND empresa_id = public.current_empresa_id());

CREATE POLICY conversas_delete_own ON public.conversas
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND empresa_id = public.current_empresa_id());

CREATE POLICY conversas_master_all ON public.conversas
  FOR ALL TO authenticated
  USING (public.is_master())
  WITH CHECK (public.is_master());

-- uso_recursos
CREATE POLICY uso_recursos_select ON public.uso_recursos
  FOR SELECT TO authenticated
  USING (
    empresa_id = public.current_empresa_id()
    OR public.is_master()
  );

CREATE POLICY uso_recursos_master_all ON public.uso_recursos
  FOR ALL TO authenticated
  USING (public.is_master())
  WITH CHECK (public.is_master());

-- auditoria
CREATE POLICY auditoria_master_select ON public.auditoria
  FOR SELECT TO authenticated
  USING (public.is_master());

CREATE POLICY auditoria_admin_select_tenant ON public.auditoria
  FOR SELECT TO authenticated
  USING (
    public.is_tenant_admin()
    AND empresa_id = public.current_empresa_id()
  );
