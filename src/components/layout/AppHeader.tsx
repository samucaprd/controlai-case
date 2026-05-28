import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { useNavigate } from "react-router-dom";

export function AppHeader() {
  const { perfil, empresa, signOut } = useAuth();
  const navigate = useNavigate();

  const initials =
    perfil?.nome_completo
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "U";

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth/login");
  };

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-full items-center gap-4 px-4">
        <SidebarTrigger />

        <div className="flex-1">
          {empresa?.nome && (
            <p className="text-sm text-muted-foreground truncate">
              {empresa.nome}
            </p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              {perfil?.nome_completo ?? perfil?.email ?? "Minha Conta"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => void handleSignOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
