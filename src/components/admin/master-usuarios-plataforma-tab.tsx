import { Building2, RefreshCw, Shield, UserCheck, Users } from "lucide-react";
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
import { useMasterUsers } from "@/features/master/use-master-users";
import type { AppRole } from "@/features/auth/types";
import { cn } from "@/lib/utils";

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

export function MasterUsuariosPlataformaTab() {
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
    useSupabase,
  } = useMasterUsers();

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
            <CardTitle>Usuários de todas as empresas</CardTitle>
            <CardDescription>
              Visão cross-tenant para auditoria e suporte. Gestão (convite, edição e
              exclusão) permanece no contexto de cada empresa pelo Admin do tenant.
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium max-w-[180px] truncate">
                        {u.empresaNome}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate">{u.nome}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {u.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={u.role === "master" ? "default" : "outline"}
                          className={cn(
                            u.role === "master" && "bg-primary/15 text-primary hover:bg-primary/15",
                          )}
                        >
                          {ROLE_LABELS[u.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.status === "ativo" ? "default" : "secondary"}>
                          {u.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {u.ultimoAcesso ?? "Nunca"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
