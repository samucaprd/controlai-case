-- Corrige busca: "CREATE" não deve casar com o campo created_at no JSON

CREATE OR REPLACE FUNCTION public.audit_log_is_operation_search(p_search TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_q TEXT := lower(trim(p_search));
BEGIN
  IF v_q IS NULL OR v_q = '' THEN RETURN FALSE; END IF;

  IF v_q IN (
    'create', 'criar', 'criado', 'criada', 'criação', 'criacao', 'inserir', 'inserção', 'insercao', 'insert',
    'update', 'atualizar', 'atualizado', 'atualizada', 'editar', 'editado', 'alterar', 'alterado',
    'delete', 'excluir', 'excluído', 'excluido', 'excluída', 'excluida', 'remover', 'removido', 'apagar', 'apagado'
  ) THEN RETURN TRUE; END IF;

  IF v_q LIKE '%usuário criado%' OR v_q LIKE '%usuario criado%' THEN RETURN TRUE; END IF;
  IF v_q LIKE '%usuário atualizado%' OR v_q LIKE '%usuario atualizado%' THEN RETURN TRUE; END IF;
  IF v_q LIKE '%usuário excluído%' OR v_q LIKE '%usuario excluido%' OR v_q LIKE '%usuario excluído%' THEN RETURN TRUE; END IF;
  IF v_q LIKE '%empresa criada%' OR v_q LIKE '%empresa atualizada%' OR v_q LIKE '%empresa excluída%' OR v_q LIKE '%empresa excluida%' THEN RETURN TRUE; END IF;
  IF v_q LIKE '%registro criado%' OR v_q LIKE '%registro atualizado%' OR v_q LIKE '%registro excluído%' OR v_q LIKE '%registro excluido%' THEN RETURN TRUE; END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_log_json_searchable_text(p_data JSONB)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    (
      COALESCE(p_data, '{}'::jsonb)
      - 'created_at'
      - 'updated_at'
      - 'id'
      - 'ultimo_acesso'
      - 'avatar_url'
      - 'empresa_id'
    )::text
  );
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
  v_json_text TEXT;
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

  -- Sinônimos de operação SQL (apenas acao exata)
  IF v_q IN ('create', 'criar', 'criado', 'criada', 'criação', 'criacao', 'inserir', 'inserção', 'insercao', 'insert')
     AND p_acao = 'INSERT' THEN RETURN TRUE; END IF;

  IF v_q IN ('update', 'atualizar', 'atualizado', 'atualizada', 'editar', 'editado', 'alterar', 'alterado')
     AND p_acao = 'UPDATE' THEN RETURN TRUE; END IF;

  IF v_q IN ('delete', 'excluir', 'excluído', 'excluido', 'excluída', 'excluida', 'remover', 'removido', 'apagar', 'apagado')
     AND p_acao = 'DELETE' THEN RETURN TRUE; END IF;

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

  -- Busca por tipo de operação: não usar JSON (evita "create" em created_at)
  IF public.audit_log_is_operation_search(v_q) THEN
    RETURN FALSE;
  END IF;

  -- Conteúdo JSON relevante (email, nome, role, etc.) — sem metadados
  v_json_text := public.audit_log_json_searchable_text(p_antes);
  IF v_json_text LIKE '%' || v_q || '%' THEN RETURN TRUE; END IF;

  v_json_text := public.audit_log_json_searchable_text(p_depois);
  IF v_json_text LIKE '%' || v_q || '%' THEN RETURN TRUE; END IF;

  RETURN FALSE;
END;
$$;
