-- Trigger function não deve ser invocável via PostgREST RPC
REVOKE ALL ON FUNCTION public.enforce_chave_api_llm_edge_only() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_chave_api_llm_edge_only() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_chave_api_llm_edge_only() FROM authenticated;
