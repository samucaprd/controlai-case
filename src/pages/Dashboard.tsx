import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, TrendingUp, Activity } from "lucide-react";
import { useSession } from "@/features/auth/session-context";

async function fetchDashboardStats(empresaId: number | null, isMaster: boolean) {
  if (isMaster) {
    const { count: empresasCount } = await supabase
      .from("empresas_public")
      .select("*", { count: "exact", head: true });
    const { count: perfisCount } = await supabase
      .from("perfis")
      .select("*", { count: "exact", head: true });
    return {
      label1: "Empresas na plataforma",
      value1: empresasCount ?? 0,
      label2: "Usuários totais",
      value2: perfisCount ?? 0,
    };
  }

  if (empresaId == null) {
    return { label1: "Colaboradores", value1: 0, label2: "Status", value2: "—" };
  }

  const { count } = await supabase
    .from("perfis")
    .select("*", { count: "exact", head: true })
    .eq("empresa_id", empresaId);

  return {
    label1: "Colaboradores no tenant",
    value1: count ?? 0,
    label2: "Plano",
    value2: "Ativo",
  };
}

const quickLinks = [
  { title: "Chat IA", url: "/dashboard/colaborador", icon: MessageSquare },
  { title: "Configurações", url: "/dashboard/admin", icon: Settings },
  { title: "Analytics", url: "/dashboard/master", icon: BarChart3 },
] as const;

export default function Dashboard() {
  const { isColaborador } = useSession();

  if (isColaborador) {
    return <Navigate to="/dashboard/colaborador" replace />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Olá, {perfil?.nome_completo ?? perfil?.email}. Visão geral da plataforma
          {empresa?.nome ? ` — ${empresa.nome}` : ""}.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stats?.label1 ?? "—"}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.value1 ?? "—"}</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stats?.label2 ?? "—"}</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.value2 ?? "—"}</div>
          </CardContent>
        </Card>
        <Card className="border-border md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Seu perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="capitalize">
              {role ?? "carregando"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Acesso rápido</CardTitle>
          <CardDescription>Navegue pelas áreas do sistema pelo menu ou pelos atalhos abaixo</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {quickLinks.map((item) => (
            <Button key={item.title} variant="outline" asChild>
              <Link to={item.url}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
              </Link>
            </Button>
          ))}
          {(role === "admin" || role === "master") && (
            <Button variant="outline" asChild>
              <Link to="/dashboard/admin/colaboradores">
                <Users className="mr-2 h-4 w-4" />
                Colaboradores
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
