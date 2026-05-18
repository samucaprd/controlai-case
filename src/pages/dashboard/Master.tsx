import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, TrendingUp, DollarSign, Activity } from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

const subscriptionData = [
  { name: "Básico", value: 145, color: "hsl(166, 100%, 50%)" },
  { name: "Empresa", value: 89, color: "hsl(42, 100%, 48%)" },
  { name: "Master", value: 23, color: "hsl(0, 0%, 69%)" }
];

const monthlyData = [
  { month: "Jan", empresas: 45, usuarios: 890 },
  { month: "Fev", empresas: 52, usuarios: 1050 },
  { month: "Mar", empresas: 61, usuarios: 1280 },
  { month: "Abr", empresas: 73, usuarios: 1520 },
  { month: "Mai", empresas: 89, usuarios: 1890 },
  { month: "Jun", empresas: 108, usuarios: 2345 }
];

const platformStats = [
  {
    title: "Total de Empresas",
    value: "257",
    change: "+23 este mês",
    icon: Building2,
    color: "text-primary"
  },
  {
    title: "Usuários Ativos",
    value: "2,345",
    change: "+12.5%",
    icon: Users,
    color: "text-secondary"
  },
  {
    title: "Receita Mensal",
    value: "R$ 48.5K",
    change: "+18.2%",
    icon: DollarSign,
    color: "text-primary"
  },
  {
    title: "Taxa de Retenção",
    value: "94.3%",
    change: "+2.1%",
    icon: TrendingUp,
    color: "text-secondary"
  }
];

export default function Master() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Master</h1>
        <p className="text-muted-foreground mt-2">
          Visão geral da plataforma completa
        </p>
      </div>

      {/* Platform Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {platformStats.map((stat, index) => (
          <Card key={index} className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="subscriptions" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="subscriptions">Assinaturas</TabsTrigger>
          <TabsTrigger value="growth">Crescimento</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Distribuição de Planos</CardTitle>
                <CardDescription>
                  Total de assinaturas ativas por plano
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={subscriptionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {subscriptionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {subscriptionData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <Badge variant="secondary">{item.value} empresas</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Resumo Financeiro</CardTitle>
                <CardDescription>
                  Receita por tipo de plano
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Plano Básico</span>
                    <span className="font-semibold">R$ 14.355</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: "30%" }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Plano Empresa</span>
                    <span className="font-semibold">R$ 26.611</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: "55%" }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Plano Master</span>
                    <span className="font-semibold">R$ 7.534</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-secondary" style={{ width: "15%" }} />
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total MRR</span>
                    <span className="text-2xl font-bold text-primary">R$ 48.500</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="growth" className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Crescimento nos Últimos 6 Meses</CardTitle>
              <CardDescription>
                Evolução de empresas e usuários na plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)"
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="empresas" 
                    fill="hsl(166, 100%, 50%)" 
                    name="Empresas"
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar 
                    dataKey="usuarios" 
                    fill="hsl(42, 100%, 48%)" 
                    name="Usuários"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Churn Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">3.2%</div>
                <p className="text-xs text-muted-foreground mt-2">
                  -0.8% vs mês anterior
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-secondary" />
                  LTV Médio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">R$ 3.450</div>
                <p className="text-xs text-muted-foreground mt-2">
                  +12% vs mês anterior
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  CAC
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">R$ 287</div>
                <p className="text-xs text-muted-foreground mt-2">
                  -5% vs mês anterior
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
