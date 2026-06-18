-- Data prevista de cancelamento da assinatura Stripe (fim do período)

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS subscription_cancel_at TIMESTAMPTZ;

DROP VIEW IF EXISTS public.empresas_public;

CREATE VIEW public.empresas_public
WITH (security_invoker = true) AS
SELECT
  id,
  nome,
  plano_id,
  (chave_api_llm IS NOT NULL AND length(trim(chave_api_llm)) > 0) AS chave_api_configurada,
  contexto_ia,
  stripe_customer_id,
  stripe_subscription_id,
  stripe_subscription_status,
  subscription_cancel_at,
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
