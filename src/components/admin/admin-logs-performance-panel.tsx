import { Database, Layers, Timer, Zap } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AUDIT_LOGS_CACHE,
  EPIC7_PERFORMANCE_POINTS,
  formatCacheAge,
  getActiveAuditIndexHints,
} from "@/features/audit/performance-hints";
import type { AuditLogsFilters } from "@/features/audit/types";
import { cn } from "@/lib/utils";

interface AdminLogsPerformancePanelProps {
  filters: AuditLogsFilters;
  dataUpdatedAt: number;
  isFetching: boolean;
  isStale: boolean;
  recordCount: number;
}

export function AdminLogsPerformancePanel({
  filters,
  dataUpdatedAt,
  isFetching,
  isStale,
  recordCount,
}: AdminLogsPerformancePanelProps) {
  const indexHints = getActiveAuditIndexHints(filters);
  const cacheLabel = isFetching
    ? "Atualizando…"
    : isStale
      ? `Cache expirado · ${formatCacheAge(dataUpdatedAt)}`
      : `Em cache · ${formatCacheAge(dataUpdatedAt)}`;

  return (
    <Collapsible className="rounded-lg border border-primary/20 bg-primary/5">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="rounded-md bg-primary/10 p-2 shrink-0">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium leading-none">
              Épico 7 — Performance &amp; cache
            </p>
            <p className="text-xs text-muted-foreground">
              Índices no Postgres + RPC única + React Query na listagem de logs.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="secondary" className="font-normal gap-1">
                <Timer className="h-3 w-3" />
                {cacheLabel}
              </Badge>
              <Badge variant="outline" className="font-normal gap-1">
                <Database className="h-3 w-3" />
                {indexHints.length} índice(s) ativo(s)
              </Badge>
              <Badge variant="outline" className="font-normal gap-1">
                <Layers className="h-3 w-3" />
                {recordCount} registro(s)
              </Badge>
            </div>
          </div>
        </div>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="shrink-0">
            Ver detalhes
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <div className="border-t border-primary/10 px-4 pb-4 pt-3 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Índices utilizados nesta consulta
            </p>
            <ul className="space-y-1">
              {indexHints.map((hint) => (
                <li
                  key={hint}
                  className="text-xs font-mono text-foreground/90 bg-background/60 rounded px-2 py-1"
                >
                  {hint}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {EPIC7_PERFORMANCE_POINTS.map((point) => (
              <div
                key={point.title}
                className="rounded-md border border-border bg-background/50 px-3 py-2"
              >
                <p className="text-sm font-medium">{point.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{point.description}</p>
              </div>
            ))}
          </div>

          <p className={cn("text-[11px] text-muted-foreground")}>
            Cache: staleTime {AUDIT_LOGS_CACHE.staleTime / 1000}s · retenção{" "}
            {AUDIT_LOGS_CACHE.gcTime / 1000}s · documentação em{" "}
            <code className="text-[10px]">docs/performance-improvements.md</code> e{" "}
            <code className="text-[10px]">docs/cache-strategy.md</code>
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
