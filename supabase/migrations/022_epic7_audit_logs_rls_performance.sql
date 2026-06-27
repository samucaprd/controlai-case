-- Epic 7: audit_logs, RLS fortalecido, índices de performance e RPC otimizada

-- ---------------------------------------------------------------------------
-- US7.1 — Tabela audit_logs (antes/depois)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  empresa_id BIGINT NULL REFERENCES public.empresas (id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  tabela TEXT NOT NULL,
  antes JSONB NULL,
  depois JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_empresa_created
  ON public.audit_logs (empresa_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tabela_created
  ON public.audit_logs (tabela, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON public.audit_logs (user_id, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_master_select ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_master());

CREATE POLICY audit_logs_admin_select_tenant ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    public.is_tenant_admin()
    AND empresa_id = public.current_empresa_id()
  );

REVOKE ALL ON public.audit_logs FROM anon;
GRANT SELECT ON public.audit_logs TO authenticated;

-- ---------------------------------------------------------------------------
-- Sanitização de payloads sensíveis nos logs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sanitize_audit_payload(
  p_data JSONB,
  p_table TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_data IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_table = 'empresas' THEN
    RETURN p_data - 'chave_api_llm';
  END IF;

  IF p_table = 'conversas' THEN
    RETURN p_data - 'mensagens';
  END IF;

  RETURN p_data;
END;
$$;

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

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_logs_record_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_antes JSONB;
  v_depois JSONB;
  v_empresa_id BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_antes := public.sanitize_audit_payload(to_jsonb(OLD), TG_TABLE_NAME);
    v_depois := NULL;
    v_empresa_id := public.resolve_audit_empresa_id(TG_TABLE_NAME, v_antes);
  ELSIF TG_OP = 'UPDATE' THEN
    v_antes := public.sanitize_audit_payload(to_jsonb(OLD), TG_TABLE_NAME);
    v_depois := public.sanitize_audit_payload(to_jsonb(NEW), TG_TABLE_NAME);
    v_empresa_id := COALESCE(
      public.resolve_audit_empresa_id(TG_TABLE_NAME, v_depois),
      public.resolve_audit_empresa_id(TG_TABLE_NAME, v_antes)
    );
  ELSE
    v_antes := NULL;
    v_depois := public.sanitize_audit_payload(to_jsonb(NEW), TG_TABLE_NAME);
    v_empresa_id := public.resolve_audit_empresa_id(TG_TABLE_NAME, v_depois);
  END IF;

  INSERT INTO public.audit_logs (user_id, empresa_id, acao, tabela, antes, depois)
  VALUES (auth.uid(), v_empresa_id, TG_OP, TG_TABLE_NAME, v_antes, v_depois);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_logs_empresas ON public.empresas;
CREATE TRIGGER audit_logs_empresas
  AFTER INSERT OR UPDATE OR DELETE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_record_change();

DROP TRIGGER IF EXISTS audit_logs_perfis ON public.perfis;
CREATE TRIGGER audit_logs_perfis
  AFTER INSERT OR UPDATE OR DELETE ON public.perfis
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_record_change();

DROP TRIGGER IF EXISTS audit_logs_agentes ON public.agentes_ia;
CREATE TRIGGER audit_logs_agentes
  AFTER INSERT OR UPDATE OR DELETE ON public.agentes_ia
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_record_change();

DROP TRIGGER IF EXISTS audit_logs_conversas ON public.conversas;
CREATE TRIGGER audit_logs_conversas
  AFTER INSERT OR UPDATE OR DELETE ON public.conversas
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_record_change();

-- Dual-write em log_auditoria (ações da aplicação)
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

  RETURN v_inserted_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_auditoria(text, text, bigint, bigint, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_auditoria(text, text, bigint, bigint, jsonb) TO authenticated;

-- RPC otimizada — evita N+1 no frontend (join único)
CREATE OR REPLACE FUNCTION public.list_audit_logs(
  p_empresa_id BIGINT DEFAULT NULL,
  p_tabela TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_nome TEXT,
  user_email TEXT,
  empresa_id BIGINT,
  empresa_nome TEXT,
  acao TEXT,
  tabela TEXT,
  antes JSONB,
  depois JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_filter BIGINT;
  v_limit INT := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
  v_offset INT := GREATEST(COALESCE(p_offset, 0), 0);
  v_search TEXT := NULLIF(trim(p_search), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF public.is_master() THEN
    v_empresa_filter := p_empresa_id;
  ELSIF public.is_tenant_admin() THEN
    v_empresa_filter := public.current_empresa_id();
  ELSE
    RAISE EXCEPTION 'Sem permissão para visualizar logs';
  END IF;

  RETURN QUERY
  SELECT
    al.id,
    al.user_id,
    p.nome_completo AS user_nome,
    p.email AS user_email,
    al.empresa_id,
    e.nome AS empresa_nome,
    al.acao,
    al.tabela,
    al.antes,
    al.depois,
    al.created_at
  FROM public.audit_logs al
  LEFT JOIN public.perfis p ON p.id = al.user_id
  LEFT JOIN public.empresas e ON e.id = al.empresa_id
  WHERE (v_empresa_filter IS NULL OR al.empresa_id = v_empresa_filter)
    AND (p_tabela IS NULL OR p_tabela = '' OR al.tabela = p_tabela)
    AND (
      v_search IS NULL
      OR al.acao ILIKE '%' || v_search || '%'
      OR al.tabela ILIKE '%' || v_search || '%'
      OR p.email ILIKE '%' || v_search || '%'
      OR p.nome_completo ILIKE '%' || v_search || '%'
      OR e.nome ILIKE '%' || v_search || '%'
    )
  ORDER BY al.created_at DESC
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.list_audit_logs(bigint, text, int, int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_audit_logs(bigint, text, int, int, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- US7.2 — RLS: políticas explícitas de negação em tabelas sensíveis
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS stripe_webhook_events_deny_all ON public.stripe_webhook_events;
CREATE POLICY stripe_webhook_events_deny_all ON public.stripe_webhook_events
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS password_reset_tokens_deny_all ON public.password_reset_tokens;
CREATE POLICY password_reset_tokens_deny_all ON public.password_reset_tokens
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- Perfis: colaboradores só leem o próprio registro (reforço)
DROP POLICY IF EXISTS perfis_select ON public.perfis;
CREATE POLICY perfis_select ON public.perfis
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_master()
    OR (
      empresa_id = public.current_empresa_id()
      AND public.is_tenant_admin()
    )
  );

-- ---------------------------------------------------------------------------
-- US7.3 — Índices compostos adicionais
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_perfis_empresa_status
  ON public.perfis (empresa_id, status);

CREATE INDEX IF NOT EXISTS idx_conversas_empresa_updated
  ON public.conversas (empresa_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_auditoria_empresa_created
  ON public.auditoria (empresa_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agentes_empresa_active
  ON public.agentes_ia (empresa_id, is_active);

CREATE INDEX IF NOT EXISTS idx_uso_recursos_empresa_mes
  ON public.uso_recursos (empresa_id, mes_referencia DESC);

CREATE INDEX IF NOT EXISTS idx_empresas_status_active
  ON public.empresas (status, is_active);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created
  ON public.audit_logs (created_at DESC);
