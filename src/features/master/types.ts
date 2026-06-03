export interface MasterPlano {
  id: number;
  nome: string;
  preco_mensal: number;
  max_usuarios: number;
  max_agentes: number;
  limite_mensagens_mes: number;
  stripe_price_id: string | null;
  features: string[];
  is_active: boolean;
  cor: string | null;
}

export interface MasterEmpresa {
  id: number;
  nome: string;
  email: string | null;
  telefone: string | null;
  status: string;
  is_active: boolean;
  plano_id: number;
  plano_nome: string;
  plano_cor: string | null;
  preco_mensal: number;
  usuarios: number;
  usuarios_ativos: number;
}

export interface MasterPlatformStats {
  totalEmpresas: number;
  empresasAtivas: number;
  receitaMensal: number;
  empresasSuspensas: number;
  churnRate: number;
  churnDelta: number;
  receitaDelta: number;
  empresasPorPlano: { nome: string; cor: string; count: number }[];
}

export interface EmpresaFormInput {
  nome: string;
  email: string;
  telefone: string;
  plano_id: number;
  status: string;
  is_active: boolean;
}

export interface PlanoFormInput {
  nome: string;
  preco_mensal: number;
  max_usuarios: number;
  max_agentes: number;
  limite_mensagens_mes: number;
  stripe_price_id: string;
  features: string[];
  is_active: boolean;
  cor: string;
  usuarios_ilimitados: boolean;
}
