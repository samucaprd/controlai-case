import { RoleGate } from "@/features/auth/role-gate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MasterStatsSection } from "@/components/master/master-stats-section";
import { MasterGerenciarClientesTab } from "@/components/master/master-gerenciar-clientes-tab";
import { MasterGerenciarPlanosTab } from "@/components/master/master-gerenciar-planos-tab";
import { useMasterPlatform } from "@/features/master/use-master-platform";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function MasterContent() {
  const {
    empresas,
    planos,
    allPlanos,
    stats,
    isLoading,
    searchEmpresa,
    setSearchEmpresa,
    createEmpresa,
    updateEmpresa,
    deleteEmpresa,
    createPlano,
    updatePlano,
    deletePlano,
    togglePlanoActive,
    useSupabase,
  } = useMasterPlatform();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Administração da Plataforma</h1>
        <p className="text-muted-foreground mt-2">
          Gerenciamento completo de planos, clientes e operações da ControllA
        </p>
      </div>

      {!useSupabase && (
        <Alert variant="destructive">
          <AlertTitle>Supabase não configurado</AlertTitle>
          <AlertDescription>
            Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local para
            carregar empresas e planos.
          </AlertDescription>
        </Alert>
      )}

      <MasterStatsSection stats={stats} />

      <Tabs defaultValue="clientes" className="space-y-6">
        <TabsList
          className={cn(
            "inline-flex h-auto w-full max-w-md rounded-full bg-muted/60 p-1",
            "grid grid-cols-2",
          )}
        >
          <TabsTrigger
            value="clientes"
            className={cn(
              "rounded-full px-4 py-2.5 text-sm font-medium transition-all",
              "data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm",
              "data-[state=inactive]:text-muted-foreground",
            )}
          >
            Gerenciar Clientes
          </TabsTrigger>
          <TabsTrigger
            value="planos"
            className={cn(
              "rounded-full px-4 py-2.5 text-sm font-medium transition-all",
              "data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm",
              "data-[state=inactive]:text-muted-foreground",
            )}
          >
            Gerenciar Planos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clientes" className="mt-0 focus-visible:outline-none">
          <MasterGerenciarClientesTab
            empresas={empresas}
            planos={allPlanos}
            isLoading={isLoading}
            search={searchEmpresa}
            onSearchChange={setSearchEmpresa}
            onCreate={createEmpresa}
            onUpdate={updateEmpresa}
            onDelete={deleteEmpresa}
          />
        </TabsContent>

        <TabsContent value="planos" className="mt-0 focus-visible:outline-none">
          <MasterGerenciarPlanosTab
            planos={planos}
            isLoading={isLoading}
            onCreate={createPlano}
            onUpdate={updatePlano}
            onDelete={deletePlano}
            onToggleActive={togglePlanoActive}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Master() {
  return (
    <RoleGate allowed={["master"]} redirectTo="/dashboard/colaborador">
      <MasterContent />
    </RoleGate>
  );
}
