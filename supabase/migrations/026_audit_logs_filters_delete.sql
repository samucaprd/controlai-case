-- Filtros por usuário/ação e exclusão de registros de audit_logs

DROP FUNCTION IF EXISTS public.list_audit_logs(bigint, text, int, int, text);

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

REVOKE ALL ON FUNCTION public.list_audit_logs(bigint, text, int, int, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_audit_logs(bigint, text, int, int, text, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_audit_log_users(
  p_empresa_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  user_nome TEXT,
  user_email TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_filter BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF public.is_master() THEN
    v_empresa_filter := p_empresa_id;
  ELSIF public.is_tenant_admin() THEN
    v_empresa_filter := public.current_empresa_id();
  ELSE
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (al.user_id)
    al.user_id,
    p.nome_completo AS user_nome,
    p.email AS user_email
  FROM public.audit_logs al
  LEFT JOIN public.perfis p ON p.id = al.user_id
  WHERE al.user_id IS NOT NULL
    AND (v_empresa_filter IS NULL OR al.empresa_id = v_empresa_filter)
  ORDER BY al.user_id, p.nome_completo NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.list_audit_log_users(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_audit_log_users(bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_audit_log(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID do log é obrigatório';
  END IF;

  IF public.is_master() THEN
    DELETE FROM public.audit_logs WHERE id = p_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
  ELSIF public.is_tenant_admin() THEN
    DELETE FROM public.audit_logs
    WHERE id = p_id
      AND empresa_id = public.current_empresa_id();
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
  ELSE
    RAISE EXCEPTION 'Sem permissão para excluir logs';
  END IF;

  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'Log não encontrado ou sem permissão';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_audit_log(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_audit_log(uuid) TO authenticated;
