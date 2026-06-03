import type { AppRole } from "./types";

export interface TenantUser {
  id: string;
  empresaId: string;
  nome: string;
  email: string;
  role: AppRole;
  status: "ativo" | "inativo";
  ultimoAcesso: string | null;
}

/** Usuários mock por empresa (tenant) — substituir por query perfis + RLS. */
export const mockTenantUsers: TenantUser[] = [
  {
    id: "u1",
    empresaId: "empresa-master",
    nome: "Anderson Brandão",
    email: "anderson.brandao@nocodestartup.io",
    role: "admin",
    status: "ativo",
    ultimoAcesso: null,
  },
  {
    id: "u2",
    empresaId: "empresa-master",
    nome: "Master",
    email: "samul.moreira2006@gmail.com",
    role: "master",
    status: "ativo",
    ultimoAcesso: "28/05/2026",
  },
  {
    id: "u3",
    empresaId: "empresa-master",
    nome: "Colaborador Demo",
    email: "colaborador@empresa.com",
    role: "user",
    status: "ativo",
    ultimoAcesso: "27/05/2026",
  },
  {
    id: "u4",
    empresaId: "empresa-demo",
    nome: "Admin Demo",
    email: "admin@demo.com",
    role: "admin",
    status: "ativo",
    ultimoAcesso: "26/05/2026",
  },
  {
    id: "u5",
    empresaId: "empresa-demo",
    nome: "Usuário Demo",
    email: "user@demo.com",
    role: "user",
    status: "inativo",
    ultimoAcesso: null,
  },
];
