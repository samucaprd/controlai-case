-- Extensions and shared utilities
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE public.app_role AS ENUM ('master', 'admin', 'user');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
