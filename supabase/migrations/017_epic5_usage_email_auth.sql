-- Epic 5: uso_recursos sync, limites de usuários, deduplicação de empresas, tokens de reset

-- Normalização de nome de empresa (deduplicação)
CREATE OR REPLACE FUNCTION public.normalize_empresa_nome(p_nome TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    lower(
      trim(
        regexp_replace(
          regexp_replace(trim(COALESCE(p_nome, '')), '\s+', ' ', 'g'),
          '[^a-zA-Z0-9\s]',
          '',
          'g'
        )
      )
    ),
    ''
  );
$$;

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS nome_normalizado TEXT;

UPDATE public.empresas
SET nome_normalizado = public.normalize_empresa_nome(nome)
WHERE nome_normalizado IS NULL;

WITH ranked AS (
  SELECT
    id,
    nome_normalizado,
    row_number() OVER (PARTITION BY nome_normalizado ORDER BY id) AS rn
  FROM public.empresas
  WHERE nome_normalizado IS NOT NULL
)
UPDATE public.empresas e
SET nome_normalizado = e.nome_normalizado || '-' || e.id::text
FROM ranked r
WHERE e.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS empresas_nome_normalizado_unique
  ON public.empresas (nome_normalizado);

-- Verificação pública para cadastro
CREATE OR REPLACE FUNCTION public.check_empresa_disponivel(p_nome TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm TEXT;
  v_exists BOOLEAN;
BEGIN
  v_norm := public.normalize_empresa_nome(p_nome);

  IF v_norm IS NULL OR length(v_norm) < 2 THEN
    RETURN jsonb_build_object(
      'disponivel', false,
      'motivo', 'Informe um nome de empresa válido (mínimo 2 caracteres).'
    );
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.empresas WHERE nome_normalizado = v_norm
  ) INTO v_exists;

  RETURN jsonb_build_object(
    'disponivel', NOT v_exists,
    'motivo',
      CASE
        WHEN v_exists THEN
          'Esta empresa já está cadastrada. Solicite um convite ao administrador ou faça login.'
        ELSE NULL
      END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_empresa_disponivel(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_empresa_disponivel(TEXT) TO anon, authenticated;

-- Provisionamento: impedir empresas duplicadas no self-register
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

-- Limite de usuários por plano (convites / inserts diretos)
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

DROP TRIGGER IF EXISTS perfis_max_users_per_plan ON public.perfis;

CREATE TRIGGER perfis_max_users_per_plan
  BEFORE INSERT ON public.perfis
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_max_usuarios_por_plano();

REVOKE ALL ON FUNCTION public.enforce_max_usuarios_por_plano() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_max_usuarios_por_plano() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_max_usuarios_por_plano() FROM authenticated;

-- Snapshot mensal de uso (agentes + usuários)
CREATE OR REPLACE FUNCTION public.sync_tenant_usage_counts(p_empresa_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mes DATE;
  v_usuarios INTEGER;
  v_agentes INTEGER;
BEGIN
  v_mes := date_trunc('month', CURRENT_DATE)::date;

  SELECT COUNT(*)::INTEGER INTO v_usuarios
  FROM public.perfis
  WHERE empresa_id = p_empresa_id
    AND status = 'ativo';

  SELECT COUNT(*)::INTEGER INTO v_agentes
  FROM public.agentes_ia
  WHERE empresa_id = p_empresa_id
    AND is_active = true;

  INSERT INTO public.uso_recursos (
    empresa_id,
    mes_referencia,
    mensagens_enviadas,
    tokens_consumidos,
    usuarios_ativos,
    agentes_ativos
  )
  VALUES (p_empresa_id, v_mes, 0, 0, v_usuarios, v_agentes)
  ON CONFLICT (empresa_id, mes_referencia)
  DO UPDATE SET
    usuarios_ativos = EXCLUDED.usuarios_ativos,
    agentes_ativos = EXCLUDED.agentes_ativos,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_usage_after_perfil()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_tenant_usage_counts(OLD.empresa_id);
    RETURN OLD;
  END IF;

  PERFORM public.sync_tenant_usage_counts(NEW.empresa_id);

  IF TG_OP = 'UPDATE' AND OLD.empresa_id IS DISTINCT FROM NEW.empresa_id THEN
    PERFORM public.sync_tenant_usage_counts(OLD.empresa_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS perfis_sync_usage ON public.perfis;

CREATE TRIGGER perfis_sync_usage
  AFTER INSERT OR UPDATE OR DELETE ON public.perfis
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_usage_after_perfil();

CREATE OR REPLACE FUNCTION public.trg_sync_usage_after_agente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_tenant_usage_counts(OLD.empresa_id);
    RETURN OLD;
  END IF;

  PERFORM public.sync_tenant_usage_counts(NEW.empresa_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS agentes_ia_sync_usage ON public.agentes_ia;

CREATE TRIGGER agentes_ia_sync_usage
  AFTER INSERT OR UPDATE OR DELETE ON public.agentes_ia
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_usage_after_agente();

-- RPC: métricas do tenant no mês corrente
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

  RETURN jsonb_build_object(
    'empresa_id', v_empresa_id,
    'mes_referencia', v_mes,
    'mensagens_enviadas', COALESCE(v_row.mensagens_enviadas, 0),
    'tokens_consumidos', COALESCE(v_row.tokens_consumidos, 0),
    'usuarios_ativos', COALESCE(v_row.usuarios_ativos, 0),
    'agentes_ativos', COALESCE(v_row.agentes_ativos, 0),
    'limites', jsonb_build_object(
      'max_usuarios', v_max_usuarios,
      'max_agentes', v_max_agentes,
      'limite_mensagens_mes', v_limite_mensagens
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_tenant_usage(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_usage(BIGINT) TO authenticated;

-- Tokens de recuperação de senha (fluxo customizado via Brevo)
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
  ON public.password_reset_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires
  ON public.password_reset_tokens (expires_at);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Backfill uso_recursos para tenants existentes
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.empresas LOOP
    PERFORM public.sync_tenant_usage_counts(r.id);
  END LOOP;
END;
$$;
