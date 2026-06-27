import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatActivityLabel, formatEntityTipo } from "@/features/audit/format";
import { useAuditLogs } from "@/features/audit/use-audit-logs";
import { useAuditEmpresasFilter } from "@/features/audit/use-audit-empresas-filter";
import type { AuditLogEntry } from "@/features/audit/types";
import { useSession } from "@/features/auth/session-context";
import { cn } from "@/lib/utils";

const TABLE_FILTER_OPTIONS = [
  { value: "all", label: "Todas as tabelas" },
  { value: "perfis", label: "Usuários" },
  { value: "empresas", label: "Empresas" },
  { value: "agentes_ia", label: "Agentes IA" },
  { value: "conversas", label: "Conversas" },
  { value: "perfil", label: "Ações do app" },
];

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

function JsonPreview({ data }: { data: Record<string, unknown> | null }) {
  if (!data || Object.keys(data).length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <pre className="max-h-40 overflow-auto rounded-md bg-muted/50 p-2 text-xs font-mono whitespace-pre-wrap break-all">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function AuditLogRow({ log }: { log: AuditLogEntry }) {
  const [open, setOpen] = useState(false);
  const hasDiff = Boolean(log.antes || log.depois);

  return (
    <>
      <TableRow>
        <TableCell className="whitespace-nowrap text-muted-foreground">
          {formatDateTime(log.createdAt)}
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="font-normal">
            {formatActivityLabel(log.acao, log.tabela)}
          </Badge>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {formatEntityTipo(log.tabela)}
        </TableCell>
        <TableCell>
          <div className="min-w-0">
            <p className="text-sm truncate">{log.userNome ?? "Sistema"}</p>
            {log.userEmail && (
              <p className="text-xs text-muted-foreground truncate">{log.userEmail}</p>
            )}
          </div>
        </TableCell>
        <TableCell className="max-w-[140px] truncate">
          {log.empresaNome ?? "—"}
        </TableCell>
        <TableCell>
          {hasDiff ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 px-2"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Ver diff
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
      </TableRow>
      {open && hasDiff && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={6} className="p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Antes</p>
                <JsonPreview data={log.antes} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Depois</p>
                <JsonPreview data={log.depois} />
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function AdminLogsTab() {
  const { user } = useSession();
  const isMaster = user.role === "master";
  const {
    logs,
    isLoading,
    isFetching,
    refresh,
    useSupabase,
    empresaId,
    setEmpresaId,
    tabela,
    setTabela,
    search,
    setSearch,
  } = useAuditLogs(isMaster);
  const { data: empresasOptions = [] } = useAuditEmpresasFilter(isMaster);

  if (!useSupabase) {
    return (
      <Card className="border-border">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Configure o Supabase para visualizar logs de auditoria.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Logs de auditoria
          </CardTitle>
          <CardDescription className="mt-1">
            {isMaster
              ? "Histórico de alterações de todas as empresas da plataforma, com estado antes e depois."
              : `Registro de ações e alterações dos usuários da empresa ${user.empresaNome}.`}
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isFetching}
          onClick={() => void refresh()}
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />
          Atualizar
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar ação, tabela, usuário ou empresa…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-input border-border"
            />
          </div>

          <Select value={tabela} onValueChange={setTabela}>
            <SelectTrigger className="bg-input border-border">
              <SelectValue placeholder="Tabela" />
            </SelectTrigger>
            <SelectContent>
              {TABLE_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isMaster ? (
            <Select
              value={empresaId == null ? "all" : String(empresaId)}
              onValueChange={(v) => setEmpresaId(v === "all" ? null : Number(v))}
            >
              <SelectTrigger className="bg-input border-border">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {empresasOptions.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center rounded-md border border-border px-3 text-sm text-muted-foreground">
              {user.empresaNome}
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          Exibindo <strong>{logs.length}</strong> registro(s)
          {isFetching && !isLoading ? " · atualizando…" : ""}
        </p>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">
            Nenhum log encontrado com os filtros atuais.
          </p>
        ) : (
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Tabela</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <AuditLogRow key={log.id} log={log} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
