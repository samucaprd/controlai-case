CREATE OR REPLACE VIEW public.empresas_public
WITH (security_invoker = true) AS
SELECT
  id,
  nome,
  plano_id,
  (chave_api_llm IS NOT NULL AND length(trim(chave_api_llm)) > 0) AS chave_api_configurada,
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

-- RLS for view (security_invoker). Frontend must query empresas_public only.
CREATE POLICY empresas_select_tenant ON public.empresas
  FOR SELECT TO authenticated
  USING (
    id = public.current_empresa_id()
    OR public.is_master()
  );
