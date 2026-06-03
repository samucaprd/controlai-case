import { Building2, DollarSign, AlertTriangle, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatBRL } from "@/features/master/format";
import type { MasterPlatformStats } from "@/features/master/types";

interface MasterStatsSectionProps {
  stats: MasterPlatformStats;
}

export function MasterStatsSection({ stats }: MasterStatsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card/50">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Total de Empresas</p>
              <p className="text-3xl font-bold mt-1">{stats.totalEmpresas}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.empresasAtivas} ativas
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Receita Mensal</p>
              <p className="text-3xl font-bold mt-1">{formatBRL(stats.receitaMensal)}</p>
              <p className="text-xs text-primary mt-1">
                +{stats.receitaDelta}% vs mês anterior
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Empresas Suspensas</p>
              <p className="text-3xl font-bold mt-1 text-destructive">
                {stats.empresasSuspensas}
              </p>
              <p className="text-xs text-destructive/80 mt-1">Requer atenção</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/15">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Taxa de Churn</p>
              <p className="text-3xl font-bold mt-1">{stats.churnRate}%</p>
              <p className="text-xs text-primary mt-1">
                {stats.churnDelta}% vs mês anterior
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
              <TrendingDown className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.empresasPorPlano.map((plano) => (
          <Card key={plano.nome} className="border-border bg-card/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: plano.cor }}
                />
                <span className="text-sm font-medium">{plano.nome}</span>
              </div>
              <p className="text-2xl font-bold mt-3">{plano.count}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {plano.count === 1 ? "empresa" : "empresas"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
