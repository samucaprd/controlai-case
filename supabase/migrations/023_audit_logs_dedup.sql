-- Evita logs duplicados: triggers gravam audit_logs em CRUD de tabelas;
-- log_auditoria grava apenas eventos semânticos da aplicação (convite, BYOK, etc.)

-- Remover triggers legados que duplicavam na tabela auditoria
DROP TRIGGER IF EXISTS audit_empresas_changes ON public.empresas;
DROP TRIGGER IF EXISTS audit_perfis_changes ON public.perfis;
DROP TRIGGER IF EXISTS audit_agentes_ia_changes ON public.agentes_ia;

-- Planos também passam a ser auditados por trigger
DROP TRIGGER IF EXISTS audit_logs_planos ON public.planos;
CREATE TRIGGER audit_logs_planos
  AFTER INSERT OR UPDATE OR DELETE ON public.planos
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_record_change();

-- Resolver empresa_id em planos (sem empresa_id na linha)
CREATE OR REPLACE FUNCTION public.resolve_audit_empresa_id(
  p_table TEXT,
  p_row JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_row IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_table IN ('perfis', 'agentes_ia', 'conversas', 'uso_recursos') THEN
    RETURN NULLIF(p_row ->> 'empresa_id', '')::BIGINT;
  END IF;

  IF p_table = 'empresas' THEN
    RETURN NULLIF(p_row ->> 'id', '')::BIGINT;
  END IF;

  IF p_table = 'planos' THEN
    RETURN NULL;
  END IF;

  RETURN NULL;
END;
$$;

-- log_auditoria: apenas tabela legada auditoria (eventos de app).
-- CRUD em tabelas monitoradas → somente triggers em audit_logs.
CREATE OR REPLACE FUNCTION public.log_auditoria(
  p_acao TEXT,
  p_entidade_tipo TEXT,
  p_entidade_id BIGINT DEFAULT NULL,
  p_empresa_id BIGINT DEFAULT NULL,
  p_detalhes JSONB DEFAULT '{}'::jsonb
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_inserted_id BIGINT;
  v_empresa_id BIGINT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  v_empresa_id := COALESCE(p_empresa_id, public.current_empresa_id());

  INSERT INTO public.auditoria (
    user_id,
    acao,
    entidade_tipo,
    entidade_id,
    empresa_id,
    detalhes
  )
  VALUES (
    v_user_id,
    p_acao,
    p_entidade_tipo,
    p_entidade_id,
    v_empresa_id,
    p_detalhes
  )
  RETURNING id INTO v_inserted_id;

  -- Eventos sem trigger dedicado (convite, BYOK, billing UI, etc.)
  IF p_entidade_tipo NOT IN ('empresa', 'empresas', 'perfil', 'perfis', 'agentes_ia', 'conversas', 'plano', 'planos') THEN
    INSERT INTO public.audit_logs (
      user_id,
      empresa_id,
      acao,
      tabela,
      antes,
      depois
    )
    VALUES (
      v_user_id,
      v_empresa_id,
      p_acao,
      p_entidade_tipo,
      NULL,
      jsonb_build_object(
        'entidade_id', p_entidade_id,
        'detalhes', p_detalhes
      )
    );
  END IF;

  RETURN v_inserted_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_auditoria(text, text, bigint, bigint, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_auditoria(text, text, bigint, bigint, jsonb) TO authenticated;
