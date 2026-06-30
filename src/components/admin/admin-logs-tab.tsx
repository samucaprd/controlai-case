import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { AdminLogsPerformancePanel } from "@/components/admin/admin-logs-performance-panel";
import { AuditLogDiffTable } from "@/features/audit/audit-log-diff-table";
import { auditActionBadgeVariant } from "@/features/audit/audit-field-labels";
import { formatActivityLabel, formatAuditTableDisplay } from "@/features/audit/format";
import { useAuditLogs } from "@/features/audit/use-audit-logs";
import { useAuditEmpresasFilter } from "@/features/audit/use-audit-empresas-filter";
import { useAuditUsersFilter } from "@/features/audit/use-audit-users-filter";
import type { AuditLogEntry } from "@/features/audit/types";
import { useSession } from "@/features/auth/session-context";
import { deleteAuditLog } from "@/lib/api/audit-logs";
import { queryKeys } from "@/lib/query/cache-keys";
import { cn } from "@/lib/utils";

const TABLE_FILTER_OPTIONS = [
  { value: "all", label: "Todas as tabelas" },
  { value: "perfis", label: "Usuários" },
  { value: "empresas", label: "Empresas" },
  { value: "agentes_ia", label: "Agentes IA" },
  { value: "conversas", label: "Conversas" },
  { value: "planos", label: "Planos" },
];

const ACTION_FILTER_OPTIONS = [
  { value: "all", label: "Todas as ações" },
  { value: "INSERT", label: "Criação" },
  { value: "UPDATE", label: "Atualização" },
  { value: "DELETE", label: "Exclusão" },
  { value: "usuario_convidado", label: "Usuário convidado" },
  { value: "byok_cadastrada", label: "BYOK cadastrada" },
  { value: "byok_rotacionada", label: "BYOK rotacionada" },
  { value: "byok_removida", label: "BYOK removida" },
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

function formatDateTimeParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d),
    time: new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d),
  };
}

interface AuditLogRowProps {
  log: AuditLogEntry;
  onDelete: (log: AuditLogEntry) => void;
  isDeleting: boolean;
}

function diffButtonLabel(acao: string): string {
  if (acao === "INSERT") return "Ver registro";
  if (acao === "DELETE") return "Ver removido";
  return "Ver alterações";
}

function AuditLogRow({ log, onDelete, isDeleting }: AuditLogRowProps) {
  const [open, setOpen] = useState(false);
  const hasDiff = Boolean(log.antes || log.depois);
  const { date, time } = formatDateTimeParts(log.createdAt);
  const tableDisplay = formatAuditTableDisplay(log.tabela);

  return (
    <>
      <TableRow>
        <TableCell className="whitespace-nowrap">
          <div>
            <p className="text-sm text-foreground">{date}</p>
            <p className="text-xs text-muted-foreground">{time}</p>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant={auditActionBadgeVariant(log.acao)} className="font-normal">
            {formatActivityLabel(log.acao, log.tabela)}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="min-w-0">
            <p className="text-sm font-medium">{tableDisplay.label}</p>
            <p className="text-xs text-muted-foreground font-mono truncate">
              {tableDisplay.technical}
            </p>
          </div>
        </TableCell>
        <TableCell>
          <div className="min-w-0">
            <p className="text-sm truncate">{log.userNome ?? "Sistema"}</p>
            {log.userEmail && (
              <p className="text-xs text-muted-foreground truncate">{log.userEmail}</p>
            )}
          </div>
        </TableCell>
        <TableCell className="max-w-[140px] truncate text-sm">
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
              {diffButtonLabel(log.acao)}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="text-right">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            disabled={isDeleting}
            onClick={() => onDelete(log)}
            aria-label="Excluir log"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
      {open && hasDiff && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={7} className="p-4 bg-muted/10">
            <AuditLogDiffTable acao={log.acao} antes={log.antes} depois={log.depois} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function AdminLogsTab() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const isMaster = user.role === "master";
  const {
    logs,
    isLoading,
    isFetching,
    isStale,
    dataUpdatedAt,
    refresh,
    useSupabase,
    empresaId,
    setEmpresaId,
    tabela,
    setTabela,
    userId,
    setUserId,
    acao,
    setAcao,
    search,
    setSearch,
    filters,
  } = useAuditLogs(isMaster);
  const { data: empresasOptions = [] } = useAuditEmpresasFilter(isMaster);
  const usersEmpresaScope = isMaster ? empresaId : Number(user.empresaId);
  const { data: usersOptions = [] } = useAuditUsersFilter(useSupabase, usersEmpresaScope);

  const [deleteTarget, setDeleteTarget] = useState<AuditLogEntry | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAuditLog(id),
    onSuccess: () => {
      toast.success("Registro de log excluído.");
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs(filters) });
      void queryClient.invalidateQueries({ queryKey: ["audit-users-filter"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Não foi possível excluir o log.");
    },
  });

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
    <>
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
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <div className="relative md:col-span-2 2xl:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar ação, tabela, usuário ou empresa…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-input border-border"
              />
            </div>

            <Select value={acao} onValueChange={setAcao}>
              <SelectTrigger className="bg-input border-border">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="bg-input border-border">
                <SelectValue placeholder="Usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                {usersOptions.map((u) => (
                  <SelectItem key={u.userId} value={u.userId}>
                    {u.userNome ?? u.userEmail ?? u.userId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
                onValueChange={(v) => {
                  setEmpresaId(v === "all" ? null : Number(v));
                  setUserId("all");
                }}
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

          <AdminLogsPerformancePanel
            filters={filters}
            dataUpdatedAt={dataUpdatedAt}
            isFetching={isFetching}
            isStale={isStale}
            recordCount={logs.length}
          />

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
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Tabela</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Alterações</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <AuditLogRow
                      key={log.id}
                      log={log}
                      onDelete={setDeleteTarget}
                      isDeleting={deleteMutation.isPending}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro de log?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove permanentemente o registro de auditoria de{" "}
              <strong>
                {deleteTarget
                  ? formatActivityLabel(deleteTarget.acao, deleteTarget.tabela)
                  : ""}
              </strong>
              {deleteTarget?.createdAt
                ? ` em ${formatDateTime(deleteTarget.createdAt)}`
                : ""}
              . Não é possível desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.id);
                }
              }}
            >
              {deleteMutation.isPending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
