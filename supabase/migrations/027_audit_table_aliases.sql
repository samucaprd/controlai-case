-- Normaliza aliases de tabela (empresa → empresas) em filtros de audit_logs

CREATE OR REPLACE FUNCTION public.normalize_audit_table(p_tabela TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(trim(COALESCE(p_tabela, '')))
    WHEN 'empresa' THEN 'empresas'
    WHEN 'perfil' THEN 'perfis'
    WHEN 'plano' THEN 'planos'
    WHEN 'conversa' THEN 'conversas'
    ELSE lower(trim(p_tabela))
  END;
$$;

CREATE OR REPLACE FUNCTION public.list_audit_logs(
  p_empresa_id BIGINT DEFAULT NULL,
  p_tabela TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_acao TEXT DEFAULT NULL
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
  v_acao TEXT := NULLIF(trim(p_acao), '');
  v_tabela TEXT := NULLIF(trim(p_tabela), '');
  v_tabela_canonical TEXT;
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

  v_tabela_canonical := CASE WHEN v_tabela IS NULL THEN NULL ELSE public.normalize_audit_table(v_tabela) END;

  RETURN QUERY
  SELECT
    al.id,
    al.user_id,
    p.nome_completo AS user_nome,
    p.email AS user_email,
    al.empresa_id,
    e.nome AS empresa_nome,
    al.acao,
    public.normalize_audit_table(al.tabela) AS tabela,
    al.antes,
    al.depois,
    al.created_at
  FROM public.audit_logs al
  LEFT JOIN public.perfis p ON p.id = al.user_id
  LEFT JOIN public.empresas e ON e.id = al.empresa_id
  WHERE (v_empresa_filter IS NULL OR al.empresa_id = v_empresa_filter)
    AND (
      v_tabela_canonical IS NULL
      OR public.normalize_audit_table(al.tabela) = v_tabela_canonical
    )
    AND (p_user_id IS NULL OR al.user_id = p_user_id)
    AND (v_acao IS NULL OR al.acao = v_acao)
    AND (
      v_search IS NULL
      OR p.email ILIKE '%' || v_search || '%'
      OR p.nome_completo ILIKE '%' || v_search || '%'
      OR e.nome ILIKE '%' || v_search || '%'
      OR public.audit_log_matches_search(al.acao, al.tabela, al.antes, al.depois, v_search)
    )
  ORDER BY al.created_at DESC
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;
