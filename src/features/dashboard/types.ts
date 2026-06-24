export interface DashboardActivityItem {
  id: number;
  acao: string;
  label: string;
  empresaNome: string | null;
  userNome: string | null;
  createdAt: string;
}

export interface DashboardSystemStatusItem {
  id: string;
  label: string;
  status: "ok" | "warning" | "error";
  detail: string;
}

export interface DashboardStats {
  scope: "platform" | "tenant";
  scopeLabel: string;
  totalUsuarios: number;
  usuariosAtivos: number;
  conversasIa: number;
  taxaSucesso: number;
  uptimePercent: number;
  uptimeLabel: string;
  recentActivity: DashboardActivityItem[];
  systemStatus: DashboardSystemStatusItem[];
}
