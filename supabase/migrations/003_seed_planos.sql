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
    '["Até 3 usuários", "Traga sua própria API", "Suporte por email", "Dashboard básico", "Segurança completa"]'::jsonb,
    '#6B7280'
  ),
  (
    'Básico',
    99.00,
    10,
    5,
    1000,
    'price_basico_placeholder',
    '["Até 10 usuários", "Traga sua própria API", "Suporte por email", "Dashboard de gestão", "Segurança completa"]'::jsonb,
    '#3B82F6'
  ),
  (
    'Empresa',
    299.00,
    50,
    20,
    10000,
    'price_empresa_placeholder',
    '["Até 50 usuários", "Traga sua própria API", "Suporte prioritário", "Analytics avançado", "Customização de contexto IA", "Gestão por departamento"]'::jsonb,
    '#8B5CF6'
  ),
  (
    'Master',
    0,
    9999,
    999,
    999999,
    'price_master_placeholder',
    '["Usuários ilimitados", "Traga sua própria API", "Suporte 24/7 dedicado", "SLA garantido", "Onboarding personalizado", "Infraestrutura dedicada"]'::jsonb,
    '#F59E0B'
  );
