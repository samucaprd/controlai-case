-- Master bypass: ignora limites de plano (usuários, agentes, mensagens no tenant do operador)

CREATE OR REPLACE FUNCTION public.should_bypass_plano_limits(p_empresa_id BIGINT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_master() THEN
    RETURN TRUE;
  END IF;

  IF p_empresa_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.perfis
    WHERE empresa_id = p_empresa_id
      AND role = 'master'
      AND status = 'ativo'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.should_bypass_plano_limits(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.should_bypass_plano_limits(BIGINT) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_max_agentes_por_plano()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max INTEGER;
  v_count INTEGER;
BEGIN
  IF public.should_bypass_plano_limits(NEW.empresa_id) THEN
    RETURN NEW;
  END IF;

  SELECT p.max_agentes INTO v_max
  FROM public.empresas e
  JOIN public.planos p ON p.id = e.plano_id
  WHERE e.id = NEW.empresa_id;

  IF v_max IS NULL THEN
    RAISE EXCEPTION 'Empresa ou plano não encontrado para validar limite de agentes'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.agentes_ia
  WHERE empresa_id = NEW.empresa_id;

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Limite de agentes do plano atingido (máximo %)', v_max
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_max_usuarios_por_plano()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max INTEGER;
  v_count INTEGER;
BEGIN
  IF public.should_bypass_plano_limits(NEW.empresa_id) THEN
    RETURN NEW;
  END IF;

  SELECT p.max_usuarios INTO v_max
  FROM public.empresas e
  JOIN public.planos p ON p.id = e.plano_id
  WHERE e.id = NEW.empresa_id;

  IF v_max IS NULL THEN
    RAISE EXCEPTION 'Empresa ou plano não encontrado para validar limite de usuários'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.perfis
  WHERE empresa_id = NEW.empresa_id
    AND status = 'ativo';

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Limite de usuários do plano atingido (máximo %)', v_max
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- Convites: não bloquear tenant do Master no provisionamento auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plano_id BIGINT;
  v_empresa_id BIGINT;
  v_empresa_nome TEXT;
  v_nome_normalizado TEXT;
  v_nome_completo TEXT;
  v_invited BOOLEAN;
  v_role TEXT;
  v_max_usuarios INTEGER;
  v_count_usuarios INTEGER;
BEGIN
  v_invited := COALESCE((NEW.raw_user_meta_data ->> 'invited')::boolean, false);
  v_nome_completo := COALESCE(
    NEW.raw_user_meta_data ->> 'nome_completo',
    split_part(NEW.email, '@', 1)
  );

  IF v_invited THEN
    v_empresa_id := (NEW.raw_user_meta_data ->> 'empresa_id')::bigint;
    v_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'user');

    IF v_empresa_id IS NULL THEN
      RAISE EXCEPTION 'empresa_id é obrigatório para convite';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.empresas WHERE id = v_empresa_id) THEN
      RAISE EXCEPTION 'Empresa do convite não encontrada';
    END IF;

    IF v_role NOT IN ('user', 'admin') THEN
      v_role := 'user';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.perfis WHERE lower(email) = lower(NEW.email)
    ) THEN
      RAISE EXCEPTION 'E-mail já cadastrado';
    END IF;

    IF NOT public.should_bypass_plano_limits(v_empresa_id) THEN
      SELECT p.max_usuarios INTO v_max_usuarios
      FROM public.empresas e
      JOIN public.planos p ON p.id = e.plano_id
      WHERE e.id = v_empresa_id;

      SELECT COUNT(*)::INTEGER INTO v_count_usuarios
      FROM public.perfis
      WHERE empresa_id = v_empresa_id
        AND status = 'ativo';

      IF v_max_usuarios IS NOT NULL AND v_count_usuarios >= v_max_usuarios THEN
        RAISE EXCEPTION 'Limite de usuários do plano atingido (máximo %)', v_max_usuarios
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;

    INSERT INTO public.perfis (id, empresa_id, role, email, nome_completo, status)
    VALUES (
      NEW.id,
      v_empresa_id,
      v_role::public.app_role,
      NEW.email,
      v_nome_completo,
      'ativo'
    );

    PERFORM public.sync_tenant_usage_counts(v_empresa_id);
    RETURN NEW;
  END IF;

  v_empresa_nome := COALESCE(NEW.raw_user_meta_data ->> 'empresa_nome', 'Nova Empresa');
  v_nome_normalizado := public.normalize_empresa_nome(v_empresa_nome);

  IF v_nome_normalizado IS NULL OR length(v_nome_normalizado) < 2 THEN
    RAISE EXCEPTION 'Nome da empresa inválido';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.empresas WHERE nome_normalizado = v_nome_normalizado
  ) THEN
    RAISE EXCEPTION
      'Empresa já cadastrada. Solicite um convite ao administrador ou faça login.'
      USING ERRCODE = 'unique_violation';
  END IF;

  SELECT id INTO v_plano_id FROM public.planos WHERE nome = 'Free' LIMIT 1;

  IF v_plano_id IS NULL THEN
    RAISE EXCEPTION 'Plano Free não encontrado';
  END IF;

  INSERT INTO public.empresas (nome, nome_normalizado, plano_id, email)
  VALUES (v_empresa_nome, v_nome_normalizado, v_plano_id, NEW.email)
  RETURNING id INTO v_empresa_id;

  INSERT INTO public.perfis (id, empresa_id, role, email, nome_completo)
  VALUES (NEW.id, v_empresa_id, 'admin', NEW.email, v_nome_completo);

  PERFORM public.sync_tenant_usage_counts(v_empresa_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_tenant_usage(p_empresa_id BIGINT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id BIGINT;
  v_role public.app_role;
  v_mes DATE;
  v_row public.uso_recursos%ROWTYPE;
  v_max_usuarios INTEGER;
  v_max_agentes INTEGER;
  v_limite_mensagens INTEGER;
  v_unlimited BOOLEAN;
BEGIN
  v_mes := date_trunc('month', CURRENT_DATE)::date;

  SELECT empresa_id, role
  INTO v_empresa_id, v_role
  FROM public.perfis
  WHERE id = auth.uid();

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Perfil não encontrado' USING ERRCODE = '42501';
  END IF;

  IF p_empresa_id IS NOT NULL AND p_empresa_id <> v_empresa_id AND v_role <> 'master' THEN
    RAISE EXCEPTION 'Sem permissão para consultar outro tenant' USING ERRCODE = '42501';
  END IF;

  IF p_empresa_id IS NOT NULL AND v_role = 'master' THEN
    v_empresa_id := p_empresa_id;
  END IF;

  PERFORM public.sync_tenant_usage_counts(v_empresa_id);

  SELECT * INTO v_row
  FROM public.uso_recursos
  WHERE empresa_id = v_empresa_id
    AND mes_referencia = v_mes;

  SELECT p.max_usuarios, p.max_agentes, p.limite_mensagens_mes
  INTO v_max_usuarios, v_max_agentes, v_limite_mensagens
  FROM public.empresas e
  JOIN public.planos p ON p.id = e.plano_id
  WHERE e.id = v_empresa_id;

  v_unlimited := public.should_bypass_plano_limits(v_empresa_id);

  RETURN jsonb_build_object(
    'empresa_id', v_empresa_id,
    'mes_referencia', v_mes,
    'mensagens_enviadas', COALESCE(v_row.mensagens_enviadas, 0),
    'tokens_consumidos', COALESCE(v_row.tokens_consumidos, 0),
    'usuarios_ativos', COALESCE(v_row.usuarios_ativos, 0),
    'agentes_ativos', COALESCE(v_row.agentes_ativos, 0),
    'limites', jsonb_build_object(
      'max_usuarios', CASE WHEN v_unlimited THEN 0 ELSE v_max_usuarios END,
      'max_agentes', CASE WHEN v_unlimited THEN 0 ELSE v_max_agentes END,
      'limite_mensagens_mes', CASE WHEN v_unlimited THEN 0 ELSE v_limite_mensagens END,
      'ilimitado', v_unlimited
    )
  );
END;
$$;
