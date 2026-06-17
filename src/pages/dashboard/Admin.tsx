import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Key, Users } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { RoleGate } from "@/features/auth/role-gate";
import { AdminUsuariosTab } from "@/components/admin/admin-usuarios-tab";
import { MasterUsuariosPlataformaTab } from "@/components/admin/master-usuarios-plataforma-tab";
import { AdminAssinaturaTab } from "@/components/admin/admin-assinatura-tab";
import { AdminByokTab } from "@/components/admin/admin-byok-tab";
import { useTenantSubscription } from "@/features/admin/use-tenant-subscription";
import { useSession } from "@/features/auth/session-context";

function AdminContent() {
  const { user } = useSession();
  const isMaster = user.role === "master";
  const { info, isLoading, refresh } = useTenantSubscription();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const defaultTab =
    tabParam === "assinatura" || tabParam === "api" || tabParam === "usuarios"
      ? tabParam
      : "usuarios";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          {isMaster ? "Configurações e visão da plataforma" : "Configurações da Empresa"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {isMaster
            ? "Como Master, visualize usuários de todos os tenants e gerencie as configurações do seu contexto."
            : "Gerencie colaboradores, assinatura e integrações do seu tenant"}
        </p>
      </div>

      <Tabs defaultValue={defaultTab} key={defaultTab} className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="usuarios">
            <Users className="mr-2 h-4 w-4" />
            {isMaster ? "Usuários (plataforma)" : "Usuários"}
          </TabsTrigger>
          <TabsTrigger value="assinatura">
            <CreditCard className="mr-2 h-4 w-4" />
            Assinatura
          </TabsTrigger>
          <TabsTrigger value="api">
            <Key className="mr-2 h-4 w-4" />
            API & BYOK
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios">
          {isMaster ? <MasterUsuariosPlataformaTab /> : <AdminUsuariosTab />}
        </TabsContent>

        <TabsContent value="assinatura">
          <AdminAssinaturaTab info={info} isLoading={isLoading} onRefresh={refresh} />
        </TabsContent>

        <TabsContent value="api">
          <AdminByokTab info={info} isLoading={isLoading} onRefresh={refresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Admin() {
  return (
    <RoleGate
      allowed={["admin", "master"]}
      title="Configurações restritas a administradores"
      redirectTo="/dashboard/colaborador"
    >
      <AdminContent />
    </RoleGate>
  );
}
