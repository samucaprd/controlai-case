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
BEGIN
  v_empresa_nome := COALESCE(NEW.raw_user_meta_data ->> 'empresa_nome', 'Nova Empresa');
  v_nome_completo := COALESCE(
    NEW.raw_user_meta_data ->> 'nome_completo',
    split_part(NEW.email, '@', 1)
  );

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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
