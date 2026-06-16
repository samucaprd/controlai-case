import { useCallback, useEffect, useState } from "react";
import {
  fetchTenantUsage,
  type TenantUsageSnapshot,
} from "@/lib/api/uso-recursos";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { useSession } from "@/features/auth/session-context";

export function useTenantUsage() {
  const { user } = useSession();
  const useSupabase = isSupabaseConfigured();
  const [usage, setUsage] = useState<TenantUsageSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(useSupabase);

  const refresh = useCallback(async () => {
    if (!useSupabase || !user?.empresaId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetchTenantUsage(Number(user.empresaId));
      setUsage(data);
    } finally {
      setIsLoading(false);
    }
  }, [useSupabase, user?.empresaId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { usage, isLoading, refresh, useSupabase };
}
