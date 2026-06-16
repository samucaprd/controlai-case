import { escapeHtml, getSiteUrl } from "./brevo.ts";

/** Paleta ControlAI (PRD / design system) */
const COLORS = {
  bgDark: "#0E0E0E",
  bgCard: "#141414",
  primary: "#00FFC8",
  secondary: "#F5A623",
  accentBlue: "#4D9FFF",
  text: "#FFFFFF",
  textMuted: "#AFAFAF",
  border: "#333333",
} as const;

const STORAGE_BASE =
  "https://hrzsdiduafuqtxitpgoy.supabase.co/storage/v1/object/public/publico";

/** Versões otimizadas para e-mail (~20–75 KB). O PNG original tem ~564 KB e muitos clientes bloqueiam. */
const LOGO_ICON = `${STORAGE_BASE}/icone-email.png`;
const LOGO_MINIATURA = `${STORAGE_BASE}/miniatura-email.png`;

function ctaButton(label: string, href: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:32px auto 8px;">
      <tr>
        <td align="center" style="border-radius:10px;background:linear-gradient(135deg,${COLORS.primary} 0%,${COLORS.accentBlue} 100%);">
          <a href="${href}" target="_blank" rel="noopener"
             style="display:inline-block;padding:15px 36px;font-size:15px;font-weight:600;color:${COLORS.bgDark};text-decoration:none;border-radius:10px;mso-padding-alt:0;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>`;
}

function emailHeaderBrand(useFullLogo?: boolean): string {
  if (useFullLogo) {
    return `
          <tr>
            <td style="padding:0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="height:4px;background:linear-gradient(90deg,${COLORS.primary} 0%,${COLORS.accentBlue} 100%);font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:36px 40px 28px;background-color:#111111;">
              <img src="${LOGO_MINIATURA}" alt="ControlIA.io" width="240" border="0"
                   style="display:block;margin:0 auto;border:0;outline:none;max-width:100%;" />
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px;font-size:0;line-height:0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr><td style="border-top:1px solid ${COLORS.border};">&nbsp;</td></tr>
              </table>
            </td>
          </tr>`;
  }

  return `
          <tr>
            <td style="padding:0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="height:4px;background:linear-gradient(90deg,${COLORS.primary} 0%,${COLORS.accentBlue} 100%);font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:32px 32px 28px;background-color:#111111;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                      <tr>
                        <td align="center" style="padding:16px 18px;background-color:#1c1c1c;border:1px solid #2a2a2a;border-radius:20px;">
                          <table role="presentation" cellspacing="0" cellpadding="0">
                            <tr>
                              <td align="center" style="width:56px;height:56px;background-color:#0a0a0a;border-radius:14px;border:1px solid rgba(0,255,200,0.35);">
                                <img src="${LOGO_ICON}" alt="" width="48" height="48" border="0"
                                     style="display:block;margin:4px auto;border:0;outline:none;border-radius:10px;" />
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:16px;">
                    <p style="margin:0;font-size:22px;font-weight:700;color:${COLORS.text};letter-spacing:-0.4px;line-height:1.2;">
                      Control<span style="color:${COLORS.primary};">IA</span><span style="color:${COLORS.textMuted};font-weight:500;">.io</span>
                    </p>
                    <p style="margin:8px 0 0;font-size:11px;font-weight:500;color:${COLORS.textMuted};letter-spacing:1.2px;text-transform:uppercase;">
                      Inteligência Artificial privada
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px;font-size:0;line-height:0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr><td style="border-top:1px solid ${COLORS.border};">&nbsp;</td></tr>
              </table>
            </td>
          </tr>`;
}

function wrapEmailLayout(params: {
  preheader: string;
  title: string;
  bodyHtml: string;
  useFullLogo?: boolean;
}): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>${escapeHtml(params.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.bgDark};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${escapeHtml(params.preheader)}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${COLORS.bgDark};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:${COLORS.bgCard};border:1px solid ${COLORS.border};border-radius:16px;overflow:hidden;">
          ${emailHeaderBrand(params.useFullLogo)}
          <tr>
            <td style="padding:28px 36px 36px;color:${COLORS.text};font-size:16px;line-height:1.65;">
              <h1 style="margin:0 0 20px;font-size:20px;font-weight:700;color:${COLORS.primary};line-height:1.3;">
                ${escapeHtml(params.title)}
              </h1>
              ${params.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 36px 24px;border-top:1px solid ${COLORS.border};text-align:center;background-color:#111111;">
              <p style="margin:0;font-size:12px;color:${COLORS.textMuted};line-height:1.5;">
                © ControlIA.io — Inteligência Artificial privada para sua empresa
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function welcomeEmail(params: {
  nome: string;
  empresaNome: string;
}): { subject: string; html: string } {
  const siteUrl = getSiteUrl();
  const body = `
    <p>Olá <strong>${escapeHtml(params.nome)}</strong>,</p>
    <p>Sua conta no <strong>ControlIA</strong> foi criada com sucesso. A empresa
       <strong>${escapeHtml(params.empresaNome)}</strong> já está pronta para configurar agentes de IA,
       convidar colaboradores e começar a usar o chat com segurança BYOK.</p>
    <p style="color:${COLORS.textMuted};font-size:14px;">Próximos passos: configure sua chave API no painel Admin e crie seu primeiro agente.</p>
    ${ctaButton("Acessar o ControlIA", `${siteUrl}/auth/login`)}`;

  return {
    subject: "Bem-vindo ao ControlIA",
    html: wrapEmailLayout({
      preheader: `Bem-vindo, ${params.nome}! Sua empresa ${params.empresaNome} está no ControlIA.`,
      title: "Bem-vindo ao ControlIA",
      bodyHtml: body,
      useFullLogo: true,
    }),
  };
}

export function userInviteEmail(params: {
  nome: string;
  empresaNome: string;
  convidadoPor?: string;
  actionLink: string;
}): { subject: string; html: string } {
  const convidado = params.convidadoPor?.trim()
    ? `<p><strong>${escapeHtml(params.convidadoPor)}</strong> convidou você para colaborar na empresa
       <strong>${escapeHtml(params.empresaNome)}</strong>.</p>`
    : `<p>Você foi convidado para colaborar na empresa <strong>${escapeHtml(params.empresaNome)}</strong> no ControlIA.</p>`;

  const body = `
    <p>Olá <strong>${escapeHtml(params.nome)}</strong>,</p>
    ${convidado}
    <p>Clique no botão abaixo para aceitar o convite, definir sua senha e acessar a plataforma.</p>
    <p style="color:${COLORS.textMuted};font-size:13px;">Este link expira em breve. Se não esperava este convite, ignore este e-mail.</p>
    ${ctaButton("Aceitar convite", params.actionLink)}`;

  return {
    subject: `Convite para ${params.empresaNome} no ControlIA`,
    html: wrapEmailLayout({
      preheader: `Convite para participar de ${params.empresaNome} no ControlIA.`,
      title: "Você foi convidado",
      bodyHtml: body,
    }),
  };
}

export function inviteAcceptedEmail(params: {
  nome: string;
  empresaNome: string;
}): { subject: string; html: string } {
  const siteUrl = getSiteUrl();
  const body = `
    <p>Olá <strong>${escapeHtml(params.nome)}</strong>,</p>
    <p>Seu cadastro na empresa <strong>${escapeHtml(params.empresaNome)}</strong> foi concluído com sucesso.</p>
    <p>Você já pode acessar o dashboard, escolher agentes de IA e iniciar conversas com sua equipe.</p>
    ${ctaButton("Entrar no ControlIA", `${siteUrl}/auth/login`)}`;

  return {
    subject: "Cadastro concluído no ControlIA",
    html: wrapEmailLayout({
      preheader: "Seu acesso ao ControlIA está ativo.",
      title: "Cadastro concluído",
      bodyHtml: body,
    }),
  };
}

export function passwordResetEmail(params: {
  nome: string;
  resetLink: string;
}): { subject: string; html: string } {
  const body = `
    <p>Olá <strong>${escapeHtml(params.nome)}</strong>,</p>
    <p>Recebemos uma solicitação para redefinir a senha da sua conta ControlIA.</p>
    <p>Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>1 hora</strong>.</p>
    <p style="color:${COLORS.textMuted};font-size:13px;">Se você não solicitou esta alteração, ignore este e-mail — sua senha permanecerá a mesma.</p>
    ${ctaButton("Redefinir senha", params.resetLink)}`;

  return {
    subject: "Redefinir sua senha — ControlIA",
    html: wrapEmailLayout({
      preheader: "Redefina sua senha do ControlIA.",
      title: "Recuperação de senha",
      bodyHtml: body,
    }),
  };
}

export function passwordChangedEmail(params: {
  nome: string;
}): { subject: string; html: string } {
  const siteUrl = getSiteUrl();
  const body = `
    <p>Olá <strong>${escapeHtml(params.nome)}</strong>,</p>
    <p>Sua senha do ControlIA foi alterada com sucesso.</p>
    <p style="color:${COLORS.secondary};font-size:14px;">Se você não realizou esta alteração, entre em contato com o suporte imediatamente.</p>
    ${ctaButton("Acessar minha conta", `${siteUrl}/auth/login`)}`;

  return {
    subject: "Senha alterada — ControlIA",
    html: wrapEmailLayout({
      preheader: "Sua senha do ControlIA foi atualizada.",
      title: "Senha atualizada",
      bodyHtml: body,
    }),
  };
}

export function userRemovalEmail(params: {
  nome: string;
  empresaNome: string;
  motivo?: string;
}): { subject: string; html: string } {
  const motivoBlock = params.motivo?.trim()
    ? `<p><strong>Motivo informado:</strong></p><p style="color:${COLORS.textMuted};">${escapeHtml(params.motivo.trim())}</p>`
    : `<p style="color:${COLORS.textMuted};">Nenhum motivo adicional foi informado.</p>`;

  const body = `
    <p>Olá <strong>${escapeHtml(params.nome)}</strong>,</p>
    <p>Seu acesso à plataforma ControlIA na empresa <strong>${escapeHtml(params.empresaNome)}</strong> foi removido.</p>
    ${motivoBlock}
    <p>Se acredita que isso foi um engano, entre em contato com o administrador da sua empresa.</p>`;

  return {
    subject: "Seu acesso ao ControlIA foi removido",
    html: wrapEmailLayout({
      preheader: "Seu acesso ao ControlIA foi removido.",
      title: "Acesso removido",
      bodyHtml: body,
    }),
  };
}
