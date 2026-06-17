import { Navigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, MessageSquare, Bot, Coins } from "lucide-react";
import { useSession } from "@/features/auth/session-context";
import { useTenantUsage } from "@/features/admin/use-tenant-usage";

function usagePercent(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

export default function Dashboard() {
  const { isColaborador, isMaster } = useSession();
  const { usage, isLoading, useSupabase } = useTenantUsage();

  if (isColaborador) {
    return <Navigate to="/dashboard/colaborador" replace />;
  }

  const limites = usage?.limites;
  const unlimited = isMaster || Boolean(limites?.ilimitado);

  const formatLimit = (used: number, limit: number | undefined) => {
    if (unlimited) return `${used} (ilimitado)`;
    return `${used}/${limit ?? "—"}`;
  };

  const stats = usage
    ? [
        {
          title: "Usuários ativos",
          value: formatLimit(usage.usuarios_ativos, limites?.max_usuarios),
          percent: unlimited
            ? 0
            : usagePercent(usage.usuarios_ativos, limites?.max_usuarios ?? 0),
          icon: Users,
        },
        {
          title: "Mensagens (mês)",
          value: formatLimit(usage.mensagens_enviadas, limites?.limite_mensagens_mes),
          percent: unlimited
            ? 0
            : usagePercent(
                usage.mensagens_enviadas,
                limites?.limite_mensagens_mes ?? 0,
              ),
          icon: MessageSquare,
        },
        {
          title: "Agentes ativos",
          value: formatLimit(usage.agentes_ativos, limites?.max_agentes),
          percent: unlimited
            ? 0
            : usagePercent(usage.agentes_ativos, limites?.max_agentes ?? 0),
          icon: Bot,
        },
        {
          title: "Tokens consumidos",
          value: formatTokens(usage.tokens_consumidos),
          percent: 0,
          icon: Coins,
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Uso do plano no mês corrente
          {usage?.mes_referencia
            ? ` (${usage.mes_referencia.slice(0, 7)})`
            : ""}
        </p>
      </div>

      {!useSupabase && (
        <Card className="border-border">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Conecte o Supabase para ver métricas reais de uso.
          </CardContent>
        </Card>
      )}

      {useSupabase && isLoading && (
        <p className="text-sm text-muted-foreground">Carregando métricas…</p>
      )}

      {useSupabase && !isLoading && stats.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                {stat.percent > 0 && (
                  <div className="mt-3 space-y-1">
                    <Progress value={stat.percent} className="h-2" />
                    <Badge variant="secondary" className="mt-1">
                      {stat.percent}% do limite
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {useSupabase && !isLoading && !usage && (
        <Card className="border-border">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Não foi possível carregar o uso do tenant.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Limites do plano</CardTitle>
            <CardDescription>
              Validação automática em convites, agentes e chat
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {unlimited ? (
              <p className="text-muted-foreground">
                Como <strong>Master</strong>, os limites de usuários, agentes e mensagens
                não se aplicam ao seu tenant.
              </p>
            ) : (
              <>
                <p>
                  <span className="text-muted-foreground">Usuários: </span>
                  bloqueio ao convidar quando o plano atinge{" "}
                  <strong>{limites?.max_usuarios ?? "—"}</strong> colaboradores.
                </p>
                <p>
                  <span className="text-muted-foreground">Agentes: </span>
                  limite de <strong>{limites?.max_agentes ?? "—"}</strong> agentes
                  ativos por tenant.
                </p>
                <p>
                  <span className="text-muted-foreground">Mensagens: </span>
                  até <strong>{limites?.limite_mensagens_mes ?? "—"}</strong>{" "}
                  mensagens por mês no chat.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Comunicação</CardTitle>
            <CardDescription>
              E-mails transacionais via Brevo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Boas-vindas, convites, aceitação de convite e recuperação de senha customizada.</p>
            <p>
              Configure <code className="text-xs">BREVO_API_KEY</code> e{" "}
              <code className="text-xs">BREVO_SENDER_EMAIL</code> nos secrets das
              Edge Functions.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
