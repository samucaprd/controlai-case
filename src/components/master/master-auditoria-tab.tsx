import { Search, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuditLogEntry } from "@/features/master/use-master-audit";

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

function acaoLabel(acao: string): string {
  const labels: Record<string, string> = {
    empresa_criada: "Empresa criada",
    empresa_atualizada: "Empresa atualizada",
    empresa_excluida: "Empresa excluída",
    plano_criado: "Plano criado",
    plano_atualizado: "Plano atualizado",
    plano_excluido: "Plano excluído",
    plano_toggle: "Plano ativado/desativado",
    usuario_convidado: "Usuário convidado",
    usuario_atualizado: "Usuário atualizado",
    usuario_excluido: "Usuário excluído",
    byok_cadastrada: "BYOK cadastrada",
    byok_rotacionada: "BYOK rotacionada",
    byok_removida: "BYOK removida",
  };
  return labels[acao] ?? acao;
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
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border/60 last:border-0">
                    <td className="p-3 pl-4 text-muted-foreground whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="font-normal">
                        {acaoLabel(log.acao)}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {log.entidade_tipo}
                      {log.entidade_id != null && (
                        <span className="text-foreground"> #{log.entidade_id}</span>
                      )}
                    </td>
                    <td className="p-3">{log.empresa_nome ?? "—"}</td>
                    <td className="p-3 pr-4">
                      <span className="block">{log.user_nome ?? "—"}</span>
                      {log.user_email && (
                        <span className="text-xs text-muted-foreground">{log.user_email}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
