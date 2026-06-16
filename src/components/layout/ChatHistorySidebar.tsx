import { MessageSquarePlus } from "lucide-react";
import { useLocation } from "react-router-dom";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChat } from "@/features/chat/chat-context";

const CHAT_PATH = "/dashboard/colaborador";

export function ChatHistorySidebar() {
  const { pathname } = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const {
    conversas,
    selectedConversaId,
    setSelectedConversaId,
    startNewConversation,
    isLoadingConversas,
  } = useChat();

  if (!pathname.startsWith(CHAT_PATH)) {
    return null;
  }

  const handleNovaConversa = () => {
    startNewConversation();
  };

  return (
    <SidebarGroup className="border-t border-sidebar-border pt-2">
      <SidebarGroupLabel>Histórico</SidebarGroupLabel>
      <SidebarGroupContent>
        {!isCollapsed && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mb-2 w-full justify-start border-sidebar-border"
            onClick={handleNovaConversa}
          >
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            Nova conversa
          </Button>
        )}
        <SidebarMenu>
          {isLoadingConversas && !isCollapsed && (
            <p className="px-2 py-3 text-xs text-muted-foreground">Carregando…</p>
          )}
          {!isLoadingConversas && conversas.length === 0 && !isCollapsed && (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              Nenhuma conversa sua ainda.
            </p>
          )}
          {conversas.map((conversa) => (
            <SidebarMenuItem key={conversa.id}>
              <SidebarMenuButton
                type="button"
                isActive={selectedConversaId === conversa.id}
                className={cn(
                  "h-auto py-2",
                  selectedConversaId === conversa.id &&
                    "bg-sidebar-accent text-sidebar-primary",
                )}
                onClick={() => setSelectedConversaId(conversa.id)}
              >
                {!isCollapsed ? (
                  <div className="flex min-w-0 flex-col items-start gap-0.5 text-left">
                    <span className="w-full truncate text-sm font-medium">
                      {conversa.titulo}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {conversa.atualizadoEm}
                    </span>
                  </div>
                ) : (
                  <MessageSquarePlus className="h-4 w-4" />
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
