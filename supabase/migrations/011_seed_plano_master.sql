-- Plano Master (catálogo enterprise) + alinhar limites/preços com a landing
UPDATE public.planos
SET
  preco_mensal = 99.00,
  max_usuarios = 10,
  features = '["Até 10 usuários", "Traga sua própria API", "Suporte por email", "Dashboard de gestão", "Segurança completa"]'::jsonb
WHERE nome = 'Básico';

UPDATE public.planos
SET
  preco_mensal = 299.00,
  max_usuarios = 50,
  features = '["Até 50 usuários", "Traga sua própria API", "Suporte prioritário", "Analytics avançado", "Customização de contexto IA", "Gestão por departamento"]'::jsonb
WHERE nome = 'Empresa';

UPDATE public.planos
SET
  features = '["Até 3 usuários", "Traga sua própria API", "Suporte por email", "Dashboard básico", "Segurança completa"]'::jsonb
WHERE nome = 'Free';

INSERT INTO public.planos (
  nome,
  preco_mensal,
  max_usuarios,
  max_agentes,
  limite_mensagens_mes,
  stripe_price_id,
  features,
  cor,
  is_active
)
VALUES (
  'Master',
  0,
  9999,
  999,
  999999,
  'price_master_placeholder',
  '["Usuários ilimitados", "Traga sua própria API", "Suporte 24/7 dedicado", "SLA garantido", "Onboarding personalizado", "Infraestrutura dedicada"]'::jsonb,
  '#F59E0B',
  true
)
ON CONFLICT (nome) DO NOTHING;
