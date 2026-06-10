-- Limite de agentes por plano (assinatura)
CREATE OR REPLACE FUNCTION public.enforce_max_agentes_por_plano()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max INTEGER;
  v_count INTEGER;
BEGIN
  SELECT p.max_agentes INTO v_max
  FROM public.empresas e
  JOIN public.planos p ON p.id = e.plano_id
  WHERE e.id = NEW.empresa_id;

  IF v_max IS NULL THEN
    RAISE EXCEPTION 'Empresa ou plano não encontrado para validar limite de agentes'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.agentes_ia
  WHERE empresa_id = NEW.empresa_id;

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Limite de agentes do plano atingido (máximo %)', v_max
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS agentes_ia_max_per_plan ON public.agentes_ia;

CREATE TRIGGER agentes_ia_max_per_plan
  BEFORE INSERT ON public.agentes_ia
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_max_agentes_por_plano();

REVOKE ALL ON FUNCTION public.enforce_max_agentes_por_plano() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_max_agentes_por_plano() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_max_agentes_por_plano() FROM authenticated;
