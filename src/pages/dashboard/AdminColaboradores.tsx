import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/auth-context";
import { RoleGate } from "@/features/auth/role-gate";
import type { Perfil } from "@/lib/supabase/database.types";
import { toast } from "sonner";

async function fetchColaboradores(empresaId: number) {
  const { data, error } = await supabase
    .from("perfis")
    .select("id, email, nome_completo, role, status, cargo, created_at")
    .eq("empresa_id", empresaId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Perfil[];
}

function AdminColaboradoresContent() {
  const { empresa } = useAuth();
  const queryClient = useQueryClient();
  const empresaId = empresa?.id;

  const { data: colaboradores, isLoading, error } = useQuery({
    queryKey: ["colaboradores", empresaId],
    queryFn: () => fetchColaboradores(empresaId!),
    enabled: empresaId != null,
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error: updateError } = await supabase
        .from("perfis")
        .update({ status })
        .eq("id", id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["colaboradores", empresaId] });
      toast.success("Status atualizado.");
    },
    onError: () => toast.error("Não foi possível atualizar o colaborador."),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">Carregando colaboradores...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 p-4 text-destructive">
        Erro ao carregar colaboradores do tenant.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Colaboradores</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie os usuários da empresa {empresa?.nome}
        </p>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Equipe</CardTitle>
          <CardDescription>
            Adição de novos colaboradores via convite será implementada na próxima
            fase. Aqui você pode visualizar e ativar/desativar usuários existentes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {colaboradores?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.nome_completo ?? "—"}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{c.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.status === "ativo" ? "default" : "secondary"}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {c.role === "user" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={toggleStatus.isPending}
                        onClick={() =>
                          toggleStatus.mutate({
                            id: c.id,
                            status: c.status === "ativo" ? "inativo" : "ativo",
                          })
                        }
                      >
                        {c.status === "ativo" ? "Desativar" : "Ativar"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminColaboradores() {
  return (
    <RoleGate allowed={["admin", "master"]} title="Colaboradores restrito a administradores">
      <AdminColaboradoresContent />
    </RoleGate>
  );
}
