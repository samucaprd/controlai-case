-- Busca em audit_logs por rótulos PT-BR, sinônimos (CREATE/DELETE) e JSON antes/depois

CREATE OR REPLACE FUNCTION public.audit_log_display_label(
  p_acao TEXT,
  p_tabela TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_tabela = 'perfis' THEN
    IF p_acao = 'INSERT' THEN RETURN 'Usuário criado'; END IF;
    IF p_acao = 'UPDATE' THEN RETURN 'Usuário atualizado'; END IF;
    IF p_acao = 'DELETE' THEN RETURN 'Usuário excluído'; END IF;
  END IF;

  IF p_tabela = 'empresas' THEN
    IF p_acao = 'INSERT' THEN RETURN 'Empresa criada'; END IF;
    IF p_acao = 'UPDATE' THEN RETURN 'Empresa atualizada'; END IF;
    IF p_acao = 'DELETE' THEN RETURN 'Empresa excluída'; END IF;
  END IF;

  IF p_tabela = 'agentes_ia' THEN
    IF p_acao = 'INSERT' THEN RETURN 'Agente IA criado'; END IF;
    IF p_acao = 'UPDATE' THEN RETURN 'Agente IA atualizado'; END IF;
    IF p_acao = 'DELETE' THEN RETURN 'Agente IA excluído'; END IF;
  END IF;

  IF p_tabela = 'planos' THEN
    IF p_acao = 'INSERT' THEN RETURN 'Plano criado'; END IF;
    IF p_acao = 'UPDATE' THEN RETURN 'Plano atualizado'; END IF;
    IF p_acao = 'DELETE' THEN RETURN 'Plano excluído'; END IF;
  END IF;

  IF p_acao = 'INSERT' THEN RETURN 'Registro criado'; END IF;
  IF p_acao = 'UPDATE' THEN RETURN 'Registro atualizado'; END IF;
  IF p_acao = 'DELETE' THEN RETURN 'Registro excluído'; END IF;

  RETURN replace(p_acao, '_', ' ');
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_log_entity_label(p_tabela TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_tabela
    WHEN 'perfis' THEN 'Usuário'
    WHEN 'perfil' THEN 'Usuário'
    WHEN 'empresas' THEN 'Empresa'
    WHEN 'empresa' THEN 'Empresa'
    WHEN 'agentes_ia' THEN 'Agente IA'
    WHEN 'planos' THEN 'Plano'
    WHEN 'plano' THEN 'Plano'
    ELSE replace(p_tabela, '_', ' ')
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_log_matches_search(
  p_acao TEXT,
  p_tabela TEXT,
  p_antes JSONB,
  p_depois JSONB,
  p_search TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_q TEXT := lower(trim(p_search));
  v_label TEXT;
  v_entity TEXT;
BEGIN
  IF v_q IS NULL OR v_q = '' THEN
    RETURN TRUE;
  END IF;

  IF lower(p_acao) LIKE '%' || v_q || '%' THEN RETURN TRUE; END IF;
  IF lower(p_tabela) LIKE '%' || v_q || '%' THEN RETURN TRUE; END IF;

  v_label := lower(public.audit_log_display_label(p_acao, p_tabela));
  IF v_label LIKE '%' || v_q || '%' THEN RETURN TRUE; END IF;

  v_entity := lower(public.audit_log_entity_label(p_tabela));
  IF v_entity LIKE '%' || v_q || '%' THEN RETURN TRUE; END IF;

  -- Sinônimos de operação SQL
  IF v_q IN ('create', 'criar', 'criado', 'criada', 'criação', 'criacao', 'inserir', 'inserção', 'insercao', 'insert')
     AND p_acao = 'INSERT' THEN RETURN TRUE; END IF;

  IF v_q IN ('update', 'atualizar', 'atualizado', 'atualizada', 'editar', 'editado', 'alterar', 'alterado')
     AND p_acao = 'UPDATE' THEN RETURN TRUE; END IF;

  IF v_q IN ('delete', 'excluir', 'excluído', 'excluido', 'excluída', 'excluida', 'remover', 'removido', 'apagar', 'apagado')
     AND p_acao = 'DELETE' THEN RETURN TRUE; END IF;

  -- Busca parcial em rótulos compostos ("usuário criado")
  IF v_q LIKE '%usuário criado%' OR v_q LIKE '%usuario criado%' THEN
    IF p_acao = 'INSERT' AND p_tabela = 'perfis' THEN RETURN TRUE; END IF;
  END IF;

  IF v_q LIKE '%usuário atualizado%' OR v_q LIKE '%usuario atualizado%' THEN
    IF p_acao = 'UPDATE' AND p_tabela = 'perfis' THEN RETURN TRUE; END IF;
  END IF;

  IF v_q LIKE '%usuário excluído%' OR v_q LIKE '%usuario excluido%' OR v_q LIKE '%usuario excluído%' THEN
    IF p_acao = 'DELETE' AND p_tabela = 'perfis' THEN RETURN TRUE; END IF;
  END IF;

  IF v_q LIKE '%empresa criada%' AND p_acao = 'INSERT' AND p_tabela = 'empresas' THEN RETURN TRUE; END IF;
  IF v_q LIKE '%empresa atualizada%' AND p_acao = 'UPDATE' AND p_tabela = 'empresas' THEN RETURN TRUE; END IF;

  -- Conteúdo JSON (email, nome, etc.)
  IF p_antes IS NOT NULL AND lower(p_antes::text) LIKE '%' || v_q || '%' THEN RETURN TRUE; END IF;
  IF p_depois IS NOT NULL AND lower(p_depois::text) LIKE '%' || v_q || '%' THEN RETURN TRUE; END IF;

  RETURN FALSE;
END;
$$;

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

REVOKE ALL ON FUNCTION public.list_audit_logs(bigint, text, int, int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_audit_logs(bigint, text, int, int, text) TO authenticated;
