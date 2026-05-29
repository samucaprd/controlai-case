import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Users, Activity } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { RoleGate } from "@/features/auth/role-gate";
import type { EmpresaPublic, Perfil } from "@/lib/supabase/database.types";

interface PlanoRow {
  id: number;
  nome: string;
  preco_mensal: number;
}

interface AuditoriaRow {
  id: number;
  acao: string;
  entidade_tipo: string;
  empresa_id: number | null;
  created_at: string;
  detalhes: Record<string, unknown>;
}

async function fetchMasterData() {
  const [empresasRes, planosRes, perfisRes, auditoriaRes] = await Promise.all([
    supabase.from("empresas_public").select("*").order("created_at", { ascending: false }),
    supabase.from("planos").select("id, nome, preco_mensal"),
    supabase.from("perfis").select("id, empresa_id, role, email"),
    supabase
      .from("auditoria")
      .select("id, acao, entidade_tipo, empresa_id, created_at, detalhes")
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  if (empresasRes.error) throw empresasRes.error;
  if (planosRes.error) throw planosRes.error;
  if (perfisRes.error) throw perfisRes.error;
  if (auditoriaRes.error) throw auditoriaRes.error;

  return {
    empresas: (empresasRes.data ?? []) as EmpresaPublic[],
    planos: (planosRes.data ?? []) as PlanoRow[],
    perfis: (perfisRes.data ?? []) as Pick<Perfil, "id" | "empresa_id" | "role" | "email">[],
    auditoria: (auditoriaRes.data ?? []) as AuditoriaRow[],
  };
}

function MasterContent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["master-dashboard"],
    queryFn: fetchMasterData,
  });

  const planosMap = new Map(data?.planos.map((p) => [p.id, p]) ?? []);
  const usuariosPorEmpresa = (data?.perfis ?? []).reduce<Record<number, number>>(
    (acc, p) => {
      if (p.role === "master") return acc;
      acc[p.empresa_id] = (acc[p.empresa_id] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const planoCounts = (data?.empresas ?? []).reduce<Record<string, number>>(
    (acc, e) => {
      const nome = planosMap.get(e.plano_id ?? 0)?.nome ?? "Desconhecido";
      acc[nome] = (acc[nome] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const totalEmpresas = data?.empresas.length ?? 0;
  const totalUsuarios =
    data?.perfis.filter((p) => p.role !== "master").length ?? 0;

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">Carregando dados da plataforma...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        Erro ao carregar dashboard master. Verifique se seu usuário tem role{" "}
        <strong>master</strong>.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Master</h1>
        <p className="text-muted-foreground mt-2">
          Visão cross-tenant da plataforma (dados reais via RLS)
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
            <Building2 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmpresas}</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários na Plataforma</CardTitle>
            <Users className="h-5 w-5 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsuarios}</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planos Ativos</CardTitle>
            <Activity className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.planos.length ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tenants" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="tenants">Empresas (Tenants)</TabsTrigger>
          <TabsTrigger value="plans">Distribuição de Planos</TabsTrigger>
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Todas as empresas</CardTitle>
              <CardDescription>
                Listagem cross-tenant disponível apenas para role master
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Usuários</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>BYOK</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.empresas.map((empresa) => (
                    <TableRow key={empresa.id}>
                      <TableCell className="font-medium">{empresa.nome}</TableCell>
                      <TableCell>
                        {planosMap.get(empresa.plano_id ?? 0)?.nome ?? "—"}
                      </TableCell>
                      <TableCell>
                        {usuariosPorEmpresa[empresa.id ?? 0] ?? 0}
                      </TableCell>
                      <TableCell>
                        <Badge variant={empresa.is_active ? "default" : "secondary"}>
                          {empresa.status ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {empresa.chave_api_configurada ? "Sim" : "Não"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Empresas por plano</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(planoCounts).map(([nome, count]) => (
                <div key={nome} className="flex items-center justify-between">
                  <span>{nome}</span>
                  <Badge variant="secondary">{count} empresas</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Auditoria recente</CardTitle>
              <CardDescription>Últimas ações administrativas registradas</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>Empresa ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.auditoria.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">
                        Nenhum registro de auditoria ainda.
                      </TableCell>
                    </TableRow>
                  )}
                  {data?.auditoria.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>{log.acao}</TableCell>
                      <TableCell>{log.entidade_tipo}</TableCell>
                      <TableCell>{log.empresa_id ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Master() {
  return (
    <RoleGate allowed={["master"]} title="Analytics restrito a usuários master">
      <MasterContent />
    </RoleGate>
  );
}
