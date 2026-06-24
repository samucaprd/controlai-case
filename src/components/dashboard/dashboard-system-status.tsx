import { Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardSystemStatusItem } from "@/features/dashboard/types";

const STATUS_VARIANT: Record<
  DashboardSystemStatusItem["status"],
  { label: string; className: string }
> = {
  ok: {
    label: "OK",
    className: "bg-primary/15 text-primary hover:bg-primary/15",
  },
  warning: {
    label: "Atenção",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15",
  },
  error: {
    label: "Crítico",
    className: "bg-destructive/15 text-destructive hover:bg-destructive/15",
  },
};

interface DashboardSystemStatusProps {
  items: DashboardSystemStatusItem[];
}

export function DashboardSystemStatus({ items }: DashboardSystemStatusProps) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Server className="h-4 w-4 text-primary" />
          Status do Sistema
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const variant = STATUS_VARIANT[item.status];
          return (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
              </div>
              <Badge className={cn("shrink-0 font-normal", variant.className)}>
                {variant.label}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
