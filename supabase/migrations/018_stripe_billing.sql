-- Epic 6: Billing Stripe — campos de assinatura e idempotência de webhooks

ALTER TABLE public.planos
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;

CREATE INDEX IF NOT EXISTS idx_planos_stripe_price_id
  ON public.planos (stripe_price_id)
  WHERE stripe_price_id IS NOT NULL;

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT;

CREATE INDEX IF NOT EXISTS idx_empresas_stripe_customer
  ON public.empresas (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Recria view pública do tenant (novas colunas de assinatura)
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

-- Planos públicos na landing (somente leitura, planos ativos)
CREATE POLICY planos_select_active_anon ON public.planos
  FOR SELECT TO anon
  USING (is_active = true);
