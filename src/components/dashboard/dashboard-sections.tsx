import { Activity, MessageSquare, TrendingUp, Users, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDashboardPercent } from "@/features/dashboard/format";
import type { DashboardStats } from "@/features/dashboard/types";

interface DashboardMetricCardsProps {
  stats: DashboardStats;
}

export function DashboardMetricCards({ stats }: DashboardMetricCardsProps) {
  const metrics = [
    {
      title: "Total de Usuários",
      value: String(stats.totalUsuarios),
      subtitle: `${stats.usuariosAtivos} ativo(s)`,
      icon: Users,
    },
    {
      title: "Conversas IA",
      value: String(stats.conversasIa),
      subtitle: stats.scope === "platform" ? "Em toda a plataforma" : "Na sua empresa",
      icon: MessageSquare,
    },
    {
      title: "Taxa de Sucesso",
      value: formatDashboardPercent(stats.taxaSucesso),
      subtitle: "Respostas da IA nas conversas",
      icon: TrendingUp,
    },
    {
      title: "Uptime",
      value: formatDashboardPercent(stats.uptimePercent),
      subtitle: stats.uptimeLabel,
      icon: Zap,
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.title} className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
            <metric.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{metric.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface DashboardRecentActivityProps {
  items: DashboardStats["recentActivity"];
}

function formatRelativeTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function DashboardRecentActivity({ items }: DashboardRecentActivityProps) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-primary" />
          Atividade Recente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhuma atividade registrada ainda.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-1 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.userNome ?? "Sistema"}
                    {item.empresaNome ? ` · ${item.empresaNome}` : ""}
                  </p>
                </div>
                <time className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatRelativeTime(item.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
