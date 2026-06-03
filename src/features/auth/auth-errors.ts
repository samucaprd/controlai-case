export function mapAuthErrorMessage(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos. Se você entrou por convite, use exatamente a senha definida no link do e-mail (não a senha de uma conta antiga excluída).";
  }

  if (lower.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar. Abra o link do convite novamente.";
  }

  if (lower.includes("user already registered")) {
    return "Este e-mail já possui cadastro. Tente entrar ou use “Esqueci minha senha”.";
  }

  return message;
}
