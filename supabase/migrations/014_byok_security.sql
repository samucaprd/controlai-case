-- Epic 3: BYOK — impedir alteração direta de chave_api_llm pelo client autenticado
CREATE OR REPLACE FUNCTION public.enforce_chave_api_llm_edge_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.chave_api_llm IS DISTINCT FROM NEW.chave_api_llm THEN
    IF auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'chave_api_llm só pode ser alterada via Edge Function manage-byok-key'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS empresas_chave_api_llm_protect ON public.empresas;

CREATE TRIGGER empresas_chave_api_llm_protect
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_chave_api_llm_edge_only();

-- View pública: chave configurada se valor criptografado (enc:v1:) ou legado não vazio
CREATE OR REPLACE VIEW public.empresas_public
WITH (security_invoker = true) AS
SELECT
  id,
  nome,
  plano_id,
  (
    chave_api_llm IS NOT NULL
    AND length(trim(chave_api_llm)) > 0
    AND (
      chave_api_llm LIKE 'enc:v1:%'
      OR chave_api_llm NOT LIKE 'enc:%'
    )
  ) AS chave_api_configurada,
  contexto_ia,
  stripe_customer_id,
  email,
  telefone,
  endereco,
  status,
  data_adesao,
  proxima_cobranca,
  is_active,
  created_at,
  updated_at
FROM public.empresas;

GRANT SELECT ON public.empresas_public TO authenticated;
