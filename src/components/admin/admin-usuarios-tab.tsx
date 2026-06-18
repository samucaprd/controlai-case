import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ASSIGNABLE_ROLES,
  useTenantUsers,
  type TenantUserFormMode,
} from "@/features/auth/tenant-users-context";
import type { TenantUser } from "@/features/auth/mock-tenant-users";
import { useSession } from "@/features/auth/session-context";
import type { AppRole } from "@/features/auth/types";
import { UsuarioFormDialog } from "@/components/admin/usuario-form-dialog";
import { UsuarioDeleteDialog } from "@/components/admin/usuario-delete-dialog";
import { toast } from "sonner";
import { DeleteUserError } from "@/lib/api/delete-tenant-user";
import { InviteUserError } from "@/lib/api/invite-tenant-user";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { useTenantUsage } from "@/features/admin/use-tenant-usage";
import { useTenantSubscription } from "@/features/admin/use-tenant-subscription";

function initials(nome: string) {
  return nome
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AdminUsuariosTab() {
  const { user: sessionUser, isMaster } = useSession();
  const { users, isLoading, updateUser, addUser, saveUser, removeUser } =
    useTenantUsers();
  const useSupabase = isSupabaseConfigured();
  const { usage } = useTenantUsage();
  const { info: subscriptionInfo } = useTenantSubscription();

  const maxUsuarios =
    usage?.limites.max_usuarios ?? subscriptionInfo?.maxUsuarios ?? 0;
  const usuariosAtivos =
    usage?.usuarios_ativos ?? users.filter((u) => u.status === "ativo").length;
  const atUserLimit =
    !isMaster && maxUsuarios > 0 && usuariosAtivos >= maxUsuarios;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<TenantUserFormMode>("create");
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<TenantUser | null>(null);

  const openCreate = () => {
    setDialogMode("create");
    setEditingUser(null);
    setDialogOpen(true);
  };

  const openEdit = (u: TenantUser) => {
    setDialogMode("edit");
    setEditingUser(u);
    setDialogOpen(true);
  };

  const openDelete = (u: TenantUser) => {
    setDeletingUser(u);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async ({
    motivo,
    notifyByEmail,
  }: {
    motivo: string;
    notifyByEmail: boolean;
  }) => {
    if (!deletingUser) return;

    try {
      const result = await removeUser(deletingUser.id, {
        motivo,
        notifyByEmail,
      });
      toast.success("Usuário excluído.");
      if (notifyByEmail) {
        if (result.email_sent) {
          toast.success("E-mail de aviso enviado ao usuário.");
        } else if (result.email_warning) {
          toast.warning(result.email_warning);
        }
      }
    } catch (err) {
      const message =
        err instanceof DeleteUserError || err instanceof Error
          ? err.message
          : "Erro ao excluir usuário.";
      toast.error(message);
      throw err;
    }
  };

  const handleDialogSave = async (data: {
    nome: string;
    email: string;
    role: AppRole;
    status: "ativo" | "inativo";
  }) => {
    if (dialogMode === "create") {
      const result = await addUser(data);
      toast.success(
        useSupabase
          ? (result?.message ?? "Convite enviado por e-mail.")
          : "Usuário adicionado (modo demonstração).",
      );
    } else if (editingUser) {
      await saveUser(editingUser.id, data);
      toast.success("Usuário atualizado.");
    }
  };

  const handleRoleChange = async (userId: string, role: AppRole) => {
    if (role === "master") return;
    try {
      await updateUser(userId, { role });
      toast.success("Papel atualizado.");
    } catch (err) {
      const message =
        err instanceof InviteUserError || err instanceof Error
          ? err.message
          : "Erro ao atualizar papel.";
      toast.error(message);
    }
  };

  return (
    <>
      <Card className="border-border">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Gerenciar Usuários</CardTitle>
            <CardDescription>
              Colaboradores da empresa {sessionUser.empresaNome} —{" "}
              {isMaster
                ? `${usuariosAtivos} usuários (ilimitado — Master)`
                : maxUsuarios > 0
                  ? `${usuariosAtivos}/${maxUsuarios} usuários do plano`
                  : "apenas do seu tenant"}
            </CardDescription>
          </div>
          <Button
            type="button"
            className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={openCreate}
            disabled={atUserLimit}
            title={
              atUserLimit
                ? `Limite de ${maxUsuarios} usuários atingido`
                : undefined
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Usuário
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {atUserLimit && (
            <p className="text-sm text-amber-500/90 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              Limite de usuários do plano atingido. Faça upgrade na aba
              Assinatura para convidar mais colaboradores.
            </p>
          )}
          {isLoading && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Carregando usuários…
            </p>
          )}
          {!isLoading && users.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhum usuário encontrado para esta empresa.
            </p>
          )}
          {users.map((u) => {
            const isSelf = u.id === sessionUser.id;
            const isMasterUser = u.role === "master";
            const ativo = u.status === "ativo";

            return (
              <div
                key={u.id}
                className="flex flex-col gap-4 rounded-lg border border-border bg-card/50 p-4 lg:flex-row lg:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <Avatar className="h-12 w-12 border border-border">
                    <AvatarFallback className="bg-muted text-sm font-medium">
                      {initials(u.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{u.nome}</p>
                    <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Último acesso: {u.ultimoAcesso ?? "Nunca"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                  {isMasterUser ? (
                    <span className="rounded-md border border-border px-3 py-2 text-sm font-medium">
                      Master
                    </span>
                  ) : (
                    <Select
                      value={u.role}
                      onValueChange={(v) => handleRoleChange(u.id, v as AppRole)}
                      disabled={isSelf}
                    >
                      <SelectTrigger className="w-[140px] border-border bg-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSIGNABLE_ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={ativo}
                      disabled={isSelf || isMasterUser}
                      onCheckedChange={(checked) => {
                        void updateUser(u.id, {
                          status: checked ? "ativo" : "inativo",
                        }).catch((err) => {
                          toast.error(
                            err instanceof Error
                              ? err.message
                              : "Erro ao atualizar status.",
                          );
                        });
                      }}
                      aria-label={`Status de ${u.nome}`}
                    />
                    <span
                      className={cn(
                        "text-sm font-medium min-w-[44px]",
                        ativo ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 border-border"
                      aria-label={`Editar ${u.nome}`}
                      onClick={() => openEdit(u)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 border-border text-destructive hover:text-destructive"
                      disabled={isSelf || isMasterUser}
                      aria-label={`Excluir ${u.nome}`}
                      onClick={() => openDelete(u)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <UsuarioFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        usuario={editingUser}
        onSave={handleDialogSave}
      />

      <UsuarioDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        usuario={deletingUser}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
