import { Search, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuditLogEntry } from "@/features/audit/types";
import { formatActivityLabel, formatEntityTipo } from "@/features/audit/format";

interface MasterAuditoriaTabProps {
  logs: AuditLogEntry[];
  isLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function MasterAuditoriaTab({
  logs,
  isLoading,
  search,
  onSearchChange,
}: MasterAuditoriaTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Auditoria e Logs
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Ações críticas de administradores e operadores master
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar logs..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-muted/50"
          />
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && logs.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          Nenhum registro de auditoria encontrado.
        </div>
      )}

      {!isLoading && logs.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left font-medium p-3 pl-4">Data</th>
                  <th className="text-left font-medium p-3">Ação</th>
                  <th className="text-left font-medium p-3">Entidade</th>
                  <th className="text-left font-medium p-3">Empresa</th>
                  <th className="text-left font-medium p-3 pr-4">Usuário</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const entidadeId =
                    typeof log.depois?.entidade_id === "number"
                      ? log.depois.entidade_id
                      : typeof log.depois?.id === "number"
                        ? log.depois.id
                        : null;

                  return (
                  <tr key={log.id} className="border-b border-border/60 last:border-0">
                    <td className="p-3 pl-4 text-muted-foreground whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="font-normal">
                        {formatActivityLabel(log.acao, log.tabela)}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {formatEntityTipo(log.tabela)}
                      {entidadeId != null && (
                        <span className="text-foreground"> #{entidadeId}</span>
                      )}
                    </td>
                    <td className="p-3">{log.empresaNome ?? "—"}</td>
                    <td className="p-3 pr-4">
                      <span className="block">{log.userNome ?? "—"}</span>
                      {log.userEmail && (
                        <span className="text-xs text-muted-foreground">{log.userEmail}</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
