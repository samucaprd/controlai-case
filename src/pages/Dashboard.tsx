import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, TrendingUp, Activity } from "lucide-react";

const stats = [
  {
    title: "Total de Usuários",
    value: "2,345",
    change: "+12.5%",
    icon: Users,
    trend: "up"
  },
  {
    title: "Conversas IA",
    value: "18,294",
    change: "+8.2%",
    icon: MessageSquare,
    trend: "up"
  },
  {
    title: "Taxa de Sucesso",
    value: "94.3%",
    change: "+2.1%",
    icon: TrendingUp,
    trend: "up"
  },
  {
    title: "Uptime",
    value: "99.9%",
    change: "Estável",
    icon: Activity,
    trend: "neutral"
  }
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Visão geral da sua plataforma
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <Badge 
                variant={stat.trend === "up" ? "default" : "secondary"}
                className="mt-2"
              >
                {stat.change}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>
              Últimas interações na plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="flex items-center gap-4">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Nova conversa iniciada</p>
                    <p className="text-xs text-muted-foreground">
                      Há {item * 5} minutos
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Status do Sistema</CardTitle>
            <CardDescription>
              Monitoramento em tempo real
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {["API Gateway", "Banco de Dados", "Serviços IA", "Storage"].map((service) => (
                <div key={service} className="flex items-center justify-between">
                  <span className="text-sm">{service}</span>
                  <Badge className="bg-primary/10 text-primary">
                    Operacional
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
