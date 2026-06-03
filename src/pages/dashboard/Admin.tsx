import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Key, Users } from "lucide-react";
import { RoleGate } from "@/features/auth/role-gate";
import { AdminUsuariosTab } from "@/components/admin/admin-usuarios-tab";
import { AdminAssinaturaTab } from "@/components/admin/admin-assinatura-tab";
import { AdminByokTab } from "@/components/admin/admin-byok-tab";
import { useTenantSubscription } from "@/features/admin/use-tenant-subscription";

function AdminContent() {
  const { info, isLoading } = useTenantSubscription();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Configurações da Empresa</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie colaboradores, assinatura e integrações do seu tenant
        </p>
        <Button variant="link" className="mt-2 h-auto p-0" asChild>
          <Link to="/dashboard/admin/colaboradores">
            <Users className="mr-2 h-4 w-4 inline" />
            Gerenciar colaboradores
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="usuarios" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="usuarios">
            <Users className="mr-2 h-4 w-4" />
            Usuários
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
          <AdminUsuariosTab />
        </TabsContent>

        <TabsContent value="assinatura">
          <AdminAssinaturaTab info={info} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="api">
          <AdminByokTab info={info} isLoading={isLoading} />
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
