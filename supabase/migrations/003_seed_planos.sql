INSERT INTO public.planos (
  nome,
  preco_mensal,
  max_usuarios,
  max_agentes,
  limite_mensagens_mes,
  stripe_price_id,
  features,
  cor
)
VALUES
  (
    'Free',
    0,
    3,
    2,
    100,
    'price_free_placeholder',
    '["Chat básico", "Até 3 usuários"]'::jsonb,
    '#6B7280'
  ),
  (
    'Básico',
    49.90,
    10,
    5,
    1000,
    'price_basico_placeholder',
    '["Chat", "Agentes customizados", "Suporte email"]'::jsonb,
    '#3B82F6'
  ),
  (
    'Empresa',
    149.90,
    50,
    20,
    10000,
    'price_empresa_placeholder',
    '["Tudo do Básico", "Prioridade", "Auditoria"]'::jsonb,
    '#8B5CF6'
  );
