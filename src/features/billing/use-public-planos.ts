import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

export interface PublicPlano {
  id: number;
  nome: string;
  preco_mensal: number;
  max_usuarios: number;
  max_agentes: number;
  limite_mensagens_mes: number;
  features: string[];
  cor: string | null;
  stripe_price_id: string | null;
}

function parseFeatures(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((f): f is string => typeof f === "string");
  }
  return [];
}

export function usePublicPlanos() {
  const useSupabase = isSupabaseConfigured();
  const [planos, setPlanos] = useState<PublicPlano[]>([]);
  const [isLoading, setIsLoading] = useState(useSupabase);

  const fetchPlanos = useCallback(async () => {
    if (!useSupabase) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("planos")
        .select(
          "id, nome, preco_mensal, max_usuarios, max_agentes, limite_mensagens_mes, features, cor, stripe_price_id",
        )
        .eq("is_active", true)
        .order("preco_mensal", { ascending: true });

      if (error) throw error;

      setPlanos(
        (data ?? []).map((row) => ({
          id: row.id as number,
          nome: row.nome as string,
          preco_mensal: Number(row.preco_mensal ?? 0),
          max_usuarios: Number(row.max_usuarios ?? 0),
          max_agentes: Number(row.max_agentes ?? 0),
          limite_mensagens_mes: Number(row.limite_mensagens_mes ?? 0),
          features: parseFeatures(row.features),
          cor: (row.cor as string) ?? null,
          stripe_price_id: (row.stripe_price_id as string) ?? null,
        })),
      );
    } catch (err) {
      console.error("[public-planos]", err);
      setPlanos([]);
    } finally {
      setIsLoading(false);
    }
  }, [useSupabase]);

  useEffect(() => {
    void fetchPlanos();
  }, [fetchPlanos]);

  return { planos, isLoading, refresh: fetchPlanos };
}
