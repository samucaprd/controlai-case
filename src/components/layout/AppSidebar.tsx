import {
  Home,
  MessageSquare,
  Settings,
  BarChart3,
  Bot,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { ChatHistorySidebar } from "@/components/layout/ChatHistorySidebar";
import { useSession } from "@/features/auth/session-context";
import type { AppRole } from "@/features/auth/types";

interface MenuItem {
  title: string;
  url: string;
  icon: LucideIcon;
  roles: AppRole[];
}

const allMenuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    roles: ["admin", "master"],
  },
  {
    title: "Chats",
    url: "/dashboard/colaborador",
    icon: MessageSquare,
    roles: ["admin", "master", "user"],
  },
  {
    title: "Agentes IA",
    url: "/dashboard/agentes-ia",
    icon: Bot,
    roles: ["admin", "master"],
  },
  {
    title: "Configurações",
    url: "/dashboard/admin",
    icon: Settings,
    roles: ["admin", "master"],
  },
  {
    title: "Administração",
    url: "/dashboard/master",
    icon: BarChart3,
    roles: ["master"],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { user } = useSession();
  const isCollapsed = state === "collapsed";

  const menuItems = allMenuItems.filter((item) =>
    item.roles.includes(user.role),
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4">
          {!isCollapsed && (
            <h2 className="text-xl font-bold bg-hero-gradient bg-clip-text text-transparent">
              ControlIA.io
            </h2>
          )}
          {isCollapsed && (
            <div className="flex items-center justify-center">
              <div className="h-8 w-8 rounded-lg bg-hero-gradient" />
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "hover:bg-sidebar-accent/50"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <ChatHistorySidebar />
      </SidebarContent>
    </Sidebar>
  );
}
