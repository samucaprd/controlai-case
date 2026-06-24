import { useState } from "react";
import { Building2, Pencil, RefreshCw, Shield, UserCheck, Users } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MASTER_ASSIGNABLE_ROLES,
  useMasterUsers,
  type MasterPlatformUser,
} from "@/features/master/use-master-users";
import type { AppRole } from "@/features/auth/types";
import { useSession } from "@/features/auth/session-context";
import { MasterPlatformUsuarioFormDialog } from "@/components/master/master-platform-usuario-form-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ROLE_LABELS: Record<AppRole, string> = {
  master: "Master",
  admin: "Admin",
  user: "Colaborador",
};

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <Card className="border-border">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface MasterUsuariosPlataformaTabProps {
  /** Quando true, permite editar papéis e status (aba Master da plataforma). */
  canManage?: boolean;
  onUserUpdated?: () => void;
}

export function MasterUsuariosPlataformaTab({
  canManage = false,
  onUserUpdated,
}: MasterUsuariosPlataformaTabProps) {
  const { user: sessionUser } = useSession();
  const {
    users,
    stats,
    empresasOptions,
    isLoading,
    search,
    setSearch,
    empresaFilter,
    setEmpresaFilter,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    refresh,
    updateUser,
    useSupabase,
  } = useMasterUsers();

  const [editingUser, setEditingUser] = useState<MasterPlatformUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleRoleChange = async (target: MasterPlatformUser, role: AppRole) => {
    if (target.id === sessionUser.id) return;
    try {
      await updateUser(target.id, { role }, target);
      toast.success("Papel atualizado.");
      onUserUpdated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar papel.");
    }
  };

  const handleStatusChange = async (target: MasterPlatformUser, ativo: boolean) => {
    if (target.id === sessionUser.id) return;
    try {
      await updateUser(target.id, { status: ativo ? "ativo" : "inativo" }, target);
      toast.success("Status atualizado.");
      onUserUpdated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar status.");
    }
  };

  const handleDialogSave = async (data: {
    nome: string;
    role: AppRole;
    status: "ativo" | "inativo";
  }) => {
    if (!editingUser) return;
    try {
      await updateUser(
        editingUser.id,
        { nome: data.nome, role: data.role, status: data.status },
        editingUser,
      );
      toast.success("Usuário atualizado.");
      onUserUpdated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar usuário.");
      throw err;
    }
  };

  if (!useSupabase) {
    return (
      <Card className="border-border">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Configure o Supabase para visualizar usuários de todas as empresas.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Usuários na plataforma" value={stats.total} icon={Users} />
        <StatCard title="Usuários ativos" value={stats.ativos} icon={UserCheck} />
        <StatCard title="Empresas com usuários" value={stats.empresasComUsuarios} icon={Building2} />
        <StatCard title="Perfis Master" value={stats.masters} icon={Shield} />
      </div>

      <Card className="border-border">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>
              {canManage ? "Gerenciar usuários da plataforma" : "Usuários de todas as empresas"}
            </CardTitle>
            <CardDescription>
              {canManage
                ? "Altere papéis e status de qualquer usuário. Todas as mudanças são registradas na auditoria."
                : "Visão cross-tenant para auditoria e suporte. Para editar papéis em qualquer empresa, use a aba Usuários em Administração da Plataforma."}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={isLoading}
            onClick={() => void refresh()}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Input
              placeholder="Buscar nome, e-mail ou empresa…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-input border-border xl:col-span-2"
            />
            <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
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
            <div className="grid grid-cols-2 gap-3">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os papéis</SelectItem>
                  <SelectItem value="master">Master</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">Colaborador</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Exibindo <strong>{users.length}</strong> de {stats.total} usuários
            {stats.admins > 0 && (
              <>
                {" "}
                · {stats.admins} admin(s) · {stats.colaboradores} colaborador(es)
              </>
            )}
          </p>

          {isLoading ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              Carregando usuários da plataforma…
            </p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              Nenhum usuário encontrado com os filtros atuais.
            </p>
          ) : (
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Último acesso</TableHead>
                    {canManage && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const isSelf = u.id === sessionUser.id;
                    const ativo = u.status === "ativo";

                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium max-w-[180px] truncate">
                          {u.empresaNome}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate">{u.nome}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {u.email}
                        </TableCell>
                        <TableCell>
                          {canManage && !isSelf ? (
                            <Select
                              value={u.role}
                              onValueChange={(v) => void handleRoleChange(u, v as AppRole)}
                            >
                              <SelectTrigger className="w-[140px] border-border bg-input h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {MASTER_ASSIGNABLE_ROLES.map((r) => (
                                  <SelectItem key={r.value} value={r.value}>
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge
                              variant={u.role === "master" ? "default" : "outline"}
                              className={cn(
                                u.role === "master" &&
                                  "bg-primary/15 text-primary hover:bg-primary/15",
                              )}
                            >
                              {ROLE_LABELS[u.role]}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {canManage && !isSelf ? (
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={ativo}
                                onCheckedChange={(checked) =>
                                  void handleStatusChange(u, checked)
                                }
                                aria-label={`Status de ${u.nome}`}
                              />
                              <span className="text-sm text-muted-foreground">
                                {ativo ? "Ativo" : "Inativo"}
                              </span>
                            </div>
                          ) : (
                            <Badge variant={ativo ? "default" : "secondary"}>{u.status}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {u.ultimoAcesso ?? "Nunca"}
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              aria-label={`Editar ${u.nome}`}
                              onClick={() => {
                                setEditingUser(u);
                                setDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <MasterPlatformUsuarioFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          usuario={editingUser}
          isSelf={editingUser?.id === sessionUser.id}
          onSave={handleDialogSave}
        />
      )}
    </div>
  );
}
