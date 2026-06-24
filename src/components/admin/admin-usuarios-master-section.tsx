import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Globe } from "lucide-react";
import { AdminUsuariosTab } from "@/components/admin/admin-usuarios-tab";
import { MasterUsuariosPlataformaTab } from "@/components/admin/master-usuarios-plataforma-tab";

export function AdminUsuariosMasterSection() {
  return (
    <Tabs defaultValue="empresa" className="space-y-4">
      <TabsList className="bg-muted">
        <TabsTrigger value="empresa">
          <Building2 className="mr-2 h-4 w-4" />
          Minha empresa
        </TabsTrigger>
        <TabsTrigger value="plataforma">
          <Globe className="mr-2 h-4 w-4" />
          Plataforma
        </TabsTrigger>
      </TabsList>

      <TabsContent value="empresa" className="mt-0 focus-visible:outline-none">
        <AdminUsuariosTab />
      </TabsContent>

      <TabsContent value="plataforma" className="mt-0 focus-visible:outline-none">
        <MasterUsuariosPlataformaTab canManage={false} />
      </TabsContent>
    </Tabs>
  );
}
