import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgenteIA } from "./types";

interface AgentesIAStatsProps {
  agentes: AgenteIA[];
}

export function AgentesIAStats({ agentes }: AgentesIAStatsProps) {
  const total = agentes.length;
  const ativos = agentes.filter((a) => a.is_active).length;
  const populares = agentes.filter((a) => a.is_popular).length;
  const inativos = agentes.filter((a) => !a.is_active).length;

  const items = [
    { label: "Total de Agentes", value: total },
    { label: "Agentes Ativos", value: ativos },
    { label: "Agentes Populares", value: populares },
    { label: "Agentes Inativos", value: inativos },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
