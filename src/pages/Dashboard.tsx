import { Navigate } from "react-router-dom";
import { Globe, Building2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DashboardMetricCards,
  DashboardRecentActivity,
} from "@/components/dashboard/dashboard-sections";
import { DashboardSystemStatus } from "@/components/dashboard/dashboard-system-status";
import { useSession } from "@/features/auth/session-context";
import { useDashboardStats } from "@/features/dashboard/use-dashboard-stats";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { isColaborador, isMaster } = useSession();
  const { stats, isLoading, refresh, useSupabase } = useDashboardStats();

  if (isColaborador) {
    return <Navigate to="/dashboard/colaborador" replace />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            {isMaster
              ? "Visão geral de toda a plataforma ControllA"
              : "Métricas e saúde da sua empresa"}
          </p>
          {stats && (
            <Badge variant="outline" className="mt-3 gap-1 font-normal">
              {stats.scope === "platform" ? (
                <>
                  <Globe className="h-3 w-3" />
                  {stats.scopeLabel}
                </>
              ) : (
                <>
                  <Building2 className="h-3 w-3" />
                  {stats.scopeLabel}
                </>
              )}
            </Badge>
          )}
        </div>
        {useSupabase && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => void refresh()}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Atualizar
          </Button>
        )}
      </div>

      {!useSupabase && (
        <Card className="border-border">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Conecte o Supabase para ver métricas reais do dashboard.
          </CardContent>
        </Card>
      )}

      {useSupabase && isLoading && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      )}

      {useSupabase && !isLoading && stats && (
        <>
          <DashboardMetricCards stats={stats} />

          <div className="grid gap-6 md:grid-cols-2">
            <DashboardRecentActivity items={stats.recentActivity} />
            <DashboardSystemStatus items={stats.systemStatus} />
          </div>
        </>
      )}

      {useSupabase && !isLoading && !stats && (
        <Card className="border-border">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Não foi possível carregar as métricas do dashboard.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
