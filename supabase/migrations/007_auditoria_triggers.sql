CREATE OR REPLACE FUNCTION public.log_auditoria(
  p_acao TEXT,
  p_entidade_tipo TEXT,
  p_entidade_id BIGINT,
  p_detalhes JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT (public.is_master() OR public.is_tenant_admin()) THEN
    RETURN;
  END IF;

  INSERT INTO public.auditoria (
    user_id,
    acao,
    entidade_tipo,
    entidade_id,
    empresa_id,
    detalhes
  )
  VALUES (
    auth.uid(),
    p_acao,
    p_entidade_tipo,
    p_entidade_id,
    public.current_empresa_id(),
    p_detalhes
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_table_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entidade_id BIGINT;
  v_acao TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_acao := 'INSERT';
    v_entidade_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_acao := 'UPDATE';
    v_entidade_id := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    v_acao := 'DELETE';
    v_entidade_id := OLD.id;
  END IF;

  PERFORM public.log_auditoria(
    v_acao,
    TG_TABLE_NAME,
    v_entidade_id,
    jsonb_build_object('table', TG_TABLE_NAME, 'op', TG_OP)
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_empresas_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER audit_perfis_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.perfis
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER audit_agentes_ia_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.agentes_ia
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();
