-- RPC para registrar ações administrativas (client autenticado)
CREATE OR REPLACE FUNCTION public.log_auditoria(
  p_acao text,
  p_entidade_tipo text,
  p_entidade_id bigint DEFAULT NULL,
  p_empresa_id bigint DEFAULT NULL,
  p_detalhes jsonb DEFAULT '{}'::jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_inserted_id bigint;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
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
    v_user_id,
    p_acao,
    p_entidade_tipo,
    p_entidade_id,
    p_empresa_id,
    p_detalhes
  )
  RETURNING id INTO v_inserted_id;

  RETURN v_inserted_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_auditoria(text, text, bigint, bigint, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_auditoria(text, text, bigint, bigint, jsonb) TO authenticated;
