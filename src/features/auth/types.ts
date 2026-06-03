export type AppRole = "master" | "admin" | "user";

export interface SessionUser {
  id: string;
  nome: string;
  email: string;
  empresaId: string;
  empresaNome: string;
  role: AppRole;
}

export const SESSION_STORAGE_KEY = "controlia_session";
