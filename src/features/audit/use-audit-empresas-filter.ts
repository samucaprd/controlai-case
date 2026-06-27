import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase/client";
import { CACHE_TIMES } from "@/lib/query/query-client";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

export function useAuditEmpresasFilter(enabled: boolean) {
  const useSupabase = isSupabaseConfigured();

  return useQuery({
    queryKey: ["audit-empresas-filter"],
    queryFn: async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("empresas")
        .select("id, nome")
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id as number,
        nome: (row.nome as string) ?? `Empresa #${row.id}`,
      }));
    },
    enabled: useSupabase && enabled,
    staleTime: CACHE_TIMES.platform.staleTime,
    gcTime: CACHE_TIMES.platform.gcTime,
  });
}
