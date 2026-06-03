-- Convite de usuários ao tenant existente (via Edge Function + Auth invite)
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
  v_nome_completo TEXT;
  v_invited BOOLEAN;
  v_role TEXT;
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

    INSERT INTO public.perfis (id, empresa_id, role, email, nome_completo, status)
    VALUES (
      NEW.id,
      v_empresa_id,
      v_role::public.app_role,
      NEW.email,
      v_nome_completo,
      'ativo'
    );

    RETURN NEW;
  END IF;

  v_empresa_nome := COALESCE(NEW.raw_user_meta_data ->> 'empresa_nome', 'Nova Empresa');

  SELECT id INTO v_plano_id FROM public.planos WHERE nome = 'Free' LIMIT 1;

  IF v_plano_id IS NULL THEN
    RAISE EXCEPTION 'Plano Free não encontrado';
  END IF;

  INSERT INTO public.empresas (nome, plano_id, email)
  VALUES (v_empresa_nome, v_plano_id, NEW.email)
  RETURNING id INTO v_empresa_id;

  INSERT INTO public.perfis (id, empresa_id, role, email, nome_completo)
  VALUES (NEW.id, v_empresa_id, 'admin', NEW.email, v_nome_completo);

  RETURN NEW;
END;
$$;
