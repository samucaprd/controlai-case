import type { SessionUser } from "./types";

export function resolveSessionFromEmail(email: string): SessionUser {
  const emailNorm = email.trim().toLowerCase();
  const isMaster =
    emailNorm.includes("master") || emailNorm.includes("samul");
  const isAdmin = !isMaster && emailNorm.includes("admin");
  const localPart = email.split("@")[0] || "usuario";
  const nomeBase =
    localPart.charAt(0).toUpperCase() + localPart.slice(1).replace(/\./g, " ");

  if (isMaster) {
    return {
      id: "user-master",
      nome: "Master",
      email: emailNorm,
      empresaId: "empresa-master",
      empresaNome: "sua Empresa",
      role: "master",
    };
  }

  if (isAdmin) {
    return {
      id: `user-${emailNorm}`,
      nome: nomeBase,
      email: emailNorm,
      empresaId: emailNorm.includes("demo") ? "empresa-demo" : "empresa-master",
      empresaNome: "sua Empresa",
      role: "admin",
    };
  }

  return {
    id: `user-${emailNorm}`,
    nome: nomeBase,
    email: emailNorm,
    empresaId: "empresa-demo",
    empresaNome: "sua Empresa",
    role: "user",
  };
}

export function getDefaultRouteForRole(role: SessionUser["role"]): string {
  if (role === "user") return "/dashboard/colaborador";
  return "/dashboard/admin";
}
