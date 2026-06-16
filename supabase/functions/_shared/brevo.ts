export interface BrevoSendParams {
  toEmail: string;
  toName: string;
  subject: string;
  htmlContent: string;
}

export interface BrevoSendResult {
  sent: boolean;
  warning?: string;
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendBrevoEmail(
  params: BrevoSendParams,
): Promise<BrevoSendResult> {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
  const senderName = Deno.env.get("BREVO_SENDER_NAME") ?? "ControlIA";

  if (!apiKey || !senderEmail) {
    return {
      sent: false,
      warning:
        "E-mail não enviado: configure BREVO_API_KEY e BREVO_SENDER_EMAIL nos secrets da função.",
    };
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: params.toEmail, name: params.toName }],
      subject: params.subject,
      htmlContent: params.htmlContent,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return {
      sent: false,
      warning: `Falha ao enviar e-mail: ${errText.slice(0, 300)}`,
    };
  }

  return { sent: true };
}

export function getSiteUrl(): string {
  return (
    Deno.env.get("SITE_URL") ??
    Deno.env.get("VITE_SITE_URL") ??
    "http://localhost:3000"
  );
}
