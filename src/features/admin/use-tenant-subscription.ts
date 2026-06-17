import { useCallback, useEffect, useState } from "react";
import { parseByokFromContexto } from "@/lib/byok/contexto-ia";
import type { LlmProviderId } from "@/lib/byok/types";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { useSession } from "@/features/auth/session-context";

export interface TenantSubscriptionInfo {
  empresaId: number;
  empresaNome: string;
  planoId: number;
  planoNome: string;
  planoCor: string | null;
  precoMensal: number;
  maxUsuarios: number;
  maxAgentes: number;
  limiteMensagens: number;
  status: string;
  isActive: boolean;
  dataAdesao: string | null;
  proximaCobranca: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus: string | null;
  chaveApiConfigurada: boolean;
  byokEnabled: boolean;
  llmProvider: LlmProviderId;
  contextoIa: unknown;
  updatedAt: string | null;
  features: string[];
}

export function useTenantSubscription() {
  const { user } = useSession();
  const useSupabase = isSupabaseConfigured();
  const [info, setInfo] = useState<TenantSubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(useSupabase);

  const fetchInfo = useCallback(async () => {
    if (!useSupabase || !user?.empresaId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const supabase = getSupabase();
      const empresaId = Number(user.empresaId);

      const { data: empresa, error: empresaError } = await supabase
        .from("empresas_public")
        .select("*")
        .eq("id", empresaId)
        .single();

      if (empresaError || !empresa) throw empresaError ?? new Error("Empresa não encontrada");

      const { data: plano, error: planoError } = await supabase
        .from("planos")
        .select("nome, preco_mensal, max_usuarios, max_agentes, limite_mensagens_mes, cor, features")
        .eq("id", empresa.plano_id as number)
        .single();

      if (planoError || !plano) throw planoError ?? new Error("Plano não encontrado");

      const features = Array.isArray(plano.features)
        ? (plano.features as unknown[]).filter((f): f is string => typeof f === "string")
        : [];

      const byok = parseByokFromContexto(empresa.contexto_ia);

      setInfo({
        empresaId,
        empresaNome: (empresa.nome as string) ?? user.empresaNome,
        planoId: empresa.plano_id as number,
        planoNome: plano.nome as string,
        planoCor: (plano.cor as string) ?? null,
        precoMensal: Number(plano.preco_mensal ?? 0),
        maxUsuarios: Number(plano.max_usuarios ?? 0),
        maxAgentes: Number(plano.max_agentes ?? 0),
        limiteMensagens: Number(plano.limite_mensagens_mes ?? 0),
        status: (empresa.status as string) ?? "ativa",
        isActive: Boolean(empresa.is_active),
        dataAdesao: (empresa.data_adesao as string) ?? null,
        proximaCobranca: (empresa.proxima_cobranca as string) ?? null,
        stripeCustomerId: (empresa.stripe_customer_id as string) ?? null,
        stripeSubscriptionId: (empresa.stripe_subscription_id as string) ?? null,
        stripeSubscriptionStatus: (empresa.stripe_subscription_status as string) ?? null,
        chaveApiConfigurada: Boolean(empresa.chave_api_configurada),
        byokEnabled: byok.enabled,
        llmProvider: byok.provider,
        contextoIa: empresa.contexto_ia,
        updatedAt: (empresa.updated_at as string) ?? null,
        features,
      });
    } catch (err) {
      console.error("[tenant-subscription]", err);
      setInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, [useSupabase, user?.empresaId, user?.empresaNome]);

  useEffect(() => {
    void fetchInfo();
  }, [fetchInfo]);

  return { info, isLoading, refresh: fetchInfo, useSupabase };
}
