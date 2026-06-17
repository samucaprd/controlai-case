import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Sparkles, Zap, Shield, Users, ArrowRight, Check } from "lucide-react";
import { usePublicPlanos } from "@/features/billing/use-public-planos";
import { formatPlanoPreco } from "@/features/master/format";

const features = [{
  icon: Sparkles,
  title: "IA com Contexto Corporativo",
  description: "Acesso liberado por assinatura com assistente treinado no contexto interno da sua empresa."
}, {
  icon: Zap,
  title: "Economia Compartilhada",
  description: "Uma única chave API para toda a equipe. Compartilhe custos de IA entre todos os colaboradores e economize até 70% comparado a assinaturas individuais."
}, {
  icon: Shield,
  title: "Segurança e Privacidade",
  description: "Arquitetura de dados com isolamento completo, garantindo privacidade e proteção total das suas informações."
}, {
  icon: Users,
  title: "Painel de Gestão Completa",
  description: "Gerencie colaboradores, controle acessos e configure as regras de uso da IA por departamento."
}];

function usuariosLabel(maxUsuarios: number): string {
  if (maxUsuarios >= 9999) return "Usuários ilimitados";
  return `Até ${maxUsuarios} usuários`;
}

export default function Landing() {
  const { planos, isLoading: planosLoading } = usePublicPlanos();

  return <div className="min-h-screen">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-2xl font-bold bg-hero-gradient bg-clip-text text-transparent">
            ControlIA.io
          </h1>
          <div className="flex items-center gap-4">
            <Link to="/auth/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link to="/auth/register">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-primary">
                Começar Agora
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-hero-gradient opacity-20" />
        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            
            <h2 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
              Plataforma de IA{" "}
              <span className="bg-hero-gradient bg-clip-text text-transparent">
                Privada e Segura
              </span>
            </h2>
            <p className="mb-8 text-lg text-muted-foreground md:text-xl">Seu ChatGPT Privado com controle corporativo total. Uma única chave API compartilhada por toda a organização. Economize recursos e mantenha controle total sobre custos e segurança.</p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/auth/register">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-primary">
                  Comece Gratuitamente
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-primary/20 hover:bg-primary/5">
                Ver Demonstração
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h3 className="mb-4 text-3xl font-bold">Recursos Poderosos</h3>
            <p className="text-lg text-muted-foreground">
              Tudo que você precisa para automatizar e escalar seu negócio
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => <Card key={index} className="border-border bg-card hover:border-primary/50 transition-all">
                <CardHeader>
                  <div className="mb-2 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 border-t border-border bg-card/30">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h3 className="mb-4 text-3xl font-bold">Economia Inteligente</h3>
              <p className="text-lg text-muted-foreground">
                Compartilhe uma única chave API com toda a equipe e reduza custos drasticamente
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-border bg-card p-6">
                <div className="mb-4">
                  <div className="text-4xl font-bold text-primary">70%</div>
                  <div className="text-sm text-muted-foreground">Economia em relação a múltiplas assinaturas</div>
                </div>
                <p className="text-muted-foreground">
                  Em vez de cada colaborador pagar uma assinatura individual de IA, toda a equipe usa uma única chave API compartilhada.
                </p>
              </Card>
              <Card className="border-border bg-card p-6">
                <div className="mb-4">
                  <div className="text-4xl font-bold text-primary">1</div>
                  <div className="text-sm text-muted-foreground">Chave API para toda organização</div>
                </div>
                <p className="text-muted-foreground">
                  Centralize o custo de IA em uma única conta OpenAI ou Claude. Visibilidade total dos gastos e controle unificado.
                </p>
              </Card>
              <Card className="border-border bg-card p-6">
                <div className="mb-4">
                  <div className="text-4xl font-bold text-primary">100%</div>
                  <div className="text-sm text-muted-foreground">Controle sobre uso e gastos</div>
                </div>
                <p className="text-muted-foreground">
                  Configure limites por usuário, departamento ou projeto. Acompanhe em tempo real quanto cada área está consumindo.
                </p>
              </Card>
              <Card className="border-border bg-card p-6">
                <div className="mb-4">
                  <div className="text-4xl font-bold text-primary">∞</div>
                  <div className="text-sm text-muted-foreground">Uso ilimitado conforme sua API</div>
                </div>
                <p className="text-muted-foreground">
                  Não há limite artificial de uso. Seus colaboradores usam o quanto precisarem dentro dos limites da sua própria chave API.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h3 className="mb-4 text-3xl font-bold">Planos Flexíveis</h3>
            <p className="text-lg text-muted-foreground">
              Escolha o seu plano de gestão e segurança. Você controla os custos de IA usando sua própria chave de API.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {planosLoading &&
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-96 rounded-xl" />
              ))}
            {!planosLoading &&
              planos.map((plan) => {
                const highlighted = plan.nome === "Empresa";
                const displayFeatures =
                  plan.features.length > 0
                    ? plan.features
                    : [
                        usuariosLabel(plan.max_usuarios),
                        `Até ${plan.max_agentes} agentes IA`,
                        `${plan.limite_mensagens_mes.toLocaleString("pt-BR")} mensagens/mês`,
                        "Traga sua própria API",
                      ];
                const ctaHref =
                  plan.preco_mensal > 0
                    ? `/auth/register?plano=${plan.id}`
                    : "/auth/register";

                return (
                  <Card
                    key={plan.id}
                    className={`relative border-border ${highlighted ? "border-primary shadow-glow-primary scale-105" : "hover:border-primary/50"} transition-all`}
                  >
                    {highlighted && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <Badge className="bg-secondary text-secondary-foreground">
                          Mais Popular
                        </Badge>
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle>{plan.nome}</CardTitle>
                      <CardDescription>
                        {plan.preco_mensal > 0
                          ? "Assinatura mensal via Stripe"
                          : "Experimente gratuitamente"}
                      </CardDescription>
                      <div className="mt-4">
                        <span className="text-4xl font-bold">
                          {plan.nome === "Master" && plan.preco_mensal <= 0
                            ? "Personalizado"
                            : formatPlanoPreco(plan.preco_mensal).replace("/mês", "")}
                        </span>
                        {plan.preco_mensal > 0 && (
                          <span className="text-muted-foreground">/mês</span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {displayFeatures.map((feature) => (
                          <li key={feature} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Link to={ctaHref} className="w-full">
                        <Button
                          className={`w-full ${highlighted ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted hover:bg-muted/80"}`}
                        >
                          {plan.preco_mensal > 0 ? "Assinar" : "Começar Agora"}
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                );
              })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h4 className="mb-2 text-xl font-bold bg-hero-gradient bg-clip-text text-transparent">
              ControlIA.io
            </h4>
            <p className="text-sm text-muted-foreground">
              © 2024 ControlIA.io. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>;
}