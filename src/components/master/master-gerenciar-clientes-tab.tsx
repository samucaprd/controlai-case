import { useState } from "react";
import {
  Building2,
  Filter,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Skeleton } from "@/components/ui/skeleton";
import { EmpresaFormDialog, type EmpresaFormMode } from "@/components/master/empresa-form-dialog";
import { formatPlanoPreco } from "@/features/master/format";
import type { EmpresaFormInput, MasterEmpresa, MasterPlano } from "@/features/master/types";
import { toast } from "sonner";

interface MasterGerenciarClientesTabProps {
  empresas: MasterEmpresa[];
  planos: MasterPlano[];
  isLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onCreate: (input: EmpresaFormInput) => Promise<void>;
  onUpdate: (id: number, input: EmpresaFormInput) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function MasterGerenciarClientesTab({
  empresas,
  planos,
  isLoading,
  search,
  onSearchChange,
  onCreate,
  onUpdate,
  onDelete,
}: MasterGerenciarClientesTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<EmpresaFormMode>("create");
  const [editing, setEditing] = useState<MasterEmpresa | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MasterEmpresa | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setDialogMode("create");
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (empresa: MasterEmpresa) => {
    setDialogMode("edit");
    setEditing(empresa);
    setDialogOpen(true);
  };

  const handleSave = async (input: EmpresaFormInput) => {
    if (dialogMode === "edit" && editing) {
      await onUpdate(editing.id, input);
    } else {
      await onCreate(input);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDelete(deleteTarget.id);
      toast.success("Empresa excluída.");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível excluir. Verifique usuários vinculados.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Lista de Empresas</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie todas as empresas e suas assinaturas
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar empresa..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 bg-muted/50"
            />
          </div>
          <Button variant="outline" size="default" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
          <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nova Empresa
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}

        {!isLoading && empresas.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
            Nenhuma empresa encontrada.
          </div>
        )}

        {!isLoading &&
          empresas.map((empresa) => (
            <div
              key={empresa.id}
              className="flex flex-col gap-4 rounded-xl border border-border bg-card/40 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-4 min-w-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{empresa.nome}</p>
                  {empresa.email && (
                    <p className="text-sm text-muted-foreground truncate">
                      {empresa.email}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge
                      variant="outline"
                      className="gap-1.5 font-normal border-border"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: empresa.plano_cor ?? "#6B7280",
                        }}
                      />
                      {empresa.plano_nome}
                    </Badge>
                    <Badge
                      variant={
                        !empresa.is_active || empresa.status === "suspensa"
                          ? "destructive"
                          : empresa.status === "trial"
                            ? "secondary"
                            : "default"
                      }
                      className="font-normal"
                    >
                      {!empresa.is_active
                        ? "Inativa"
                        : empresa.status === "suspensa"
                          ? "Suspensa"
                          : empresa.status === "trial"
                            ? "Trial"
                            : "Ativa"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 sm:gap-8">
                <div className="text-right">
                  <p className="font-medium">{formatPlanoPreco(empresa.preco_mensal)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {empresa.usuarios} {empresa.usuarios === 1 ? "usuário" : "usuários"} ·{" "}
                    {empresa.usuarios_ativos} ativo
                    {empresa.usuarios_ativos !== 1 ? "s" : ""}
                  </p>
                  {empresa.ultimo_acesso && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Último acesso:{" "}
                      {new Intl.DateTimeFormat("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(empresa.ultimo_acesso))}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <MoreHorizontal className="h-5 w-5" />
                      <span className="sr-only">Opções</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(empresa)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteTarget(empresa)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
      </div>

      <EmpresaFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        empresa={editing}
        planos={planos}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              A empresa <strong>{deleteTarget?.nome}</strong> e todos os dados
              vinculados serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
