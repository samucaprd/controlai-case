import { Check, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPlanoPreco } from "@/features/master/format";
import type { SyncCheckoutResult } from "@/lib/api/stripe";

interface CheckoutSuccessBannerProps {
  result: SyncCheckoutResult;
  onDismiss: () => void;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function CheckoutSuccessBanner({ result, onDismiss }: CheckoutSuccessBannerProps) {
  const plano = result.plano;
  if (!plano) return null;

  const recursos = [
    plano.max_usuarios >= 9999
      ? "Usuários ilimitados"
      : `Até ${plano.max_usuarios} usuários`,
    `Até ${plano.max_agentes} agentes IA`,
    `${plano.limite_mensagens_mes.toLocaleString("pt-BR")} mensagens/mês`,
  ];

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <PartyPopper className="h-5 w-5 text-primary" />
          Pagamento confirmado!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {result.message ?? "Sua assinatura foi atualizada com sucesso."}
        </p>

        <div className="rounded-lg border border-border bg-background p-4 space-y-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-xl font-bold">{plano.nome}</span>
            <span className="text-muted-foreground">{formatPlanoPreco(plano.preco_mensal)}</span>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2">
            {recursos.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary shrink-0" />
                {item}
              </li>
            ))}
          </ul>

          {result.proxima_cobranca && (
            <p className="text-sm text-muted-foreground">
              Próxima cobrança: <strong>{formatDate(result.proxima_cobranca)}</strong>
            </p>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={onDismiss}>
          Fechar
        </Button>
      </CardContent>
    </Card>
  );
}
