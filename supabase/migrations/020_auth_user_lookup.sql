-- Lookup auth user by e-mail (service_role only) — usado no fluxo de convite
CREATE OR REPLACE FUNCTION public.auth_user_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT id
  FROM auth.users
  WHERE lower(email) = lower(trim(p_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.auth_user_id_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_id_by_email(TEXT) TO service_role;
