import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { Outlet } from "react-router-dom";
import { ChatProvider } from "@/features/chat/chat-context";
import { AgentesProvider } from "@/features/agentes-ia/agentes-context";

export default function DashboardLayout() {
  return (
    <AgentesProvider>
    <ChatProvider>
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1">
          <AppHeader />
          <main className="p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
    </ChatProvider>
    </AgentesProvider>
  );
}
