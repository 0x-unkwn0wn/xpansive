import { randomUUID } from "node:crypto";
import { renderPrivateBetaInvitation } from "@/emails/xpansive-private-beta-invitation";

export class EmailDeliveryNotConfiguredError extends Error {}
export class EmailDeliveryError extends Error {
  constructor(readonly code: "provider_rejected" | "provider_unavailable") { super("Transactional email could not be delivered."); }
}

function config(appOrigin: string) {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  const configuredOrigin = process.env.AUTH_APP_URL ?? appOrigin;
  if (provider !== "resend" || !apiKey || !from || (process.env.NODE_ENV === "production" && !process.env.AUTH_APP_URL)) {
    throw new EmailDeliveryNotConfiguredError("Transactional email is not configured.");
  }
  return { apiKey, from, origin: configuredOrigin.replace(/\/$/, ""), replyTo: process.env.AUTH_EMAIL_REPLY_TO };
}

export function assertEmailDeliveryConfigured(appOrigin: string) { config(appOrigin); }

export async function sendTransactionalEmail(input: { to: string; subject: string; html: string; text: string; idempotencyKey?: string; appOrigin: string }) {
  const settings = config(input.appOrigin);
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${settings.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": input.idempotencyKey ?? randomUUID() },
      body: JSON.stringify({ from: settings.from, to: [input.to], subject: input.subject, html: input.html, text: input.text, ...(settings.replyTo ? { reply_to: settings.replyTo } : {}) }),
    });
  } catch { throw new EmailDeliveryError("provider_unavailable"); }
  if (!response.ok) throw new EmailDeliveryError("provider_rejected");
  let body: { id?: unknown } = {};
  try { body = await response.json() as { id?: unknown }; } catch { /* A 2xx response is still provider acceptance. */ }
  return { providerMessageId: typeof body.id === "string" ? body.id : null };
}

export function invitationEmail(token: string, appOrigin: string) {
  const url = `${config(appOrigin).origin}/auth/verify#token=${encodeURIComponent(token)}`;
  return renderPrivateBetaInvitation({ recipientEmail: "", accessUrl: url });
}

export function magicLinkEmail(token: string, appOrigin: string, nextPath = "/app") {
  const url = `${config(appOrigin).origin}/auth/verify#token=${encodeURIComponent(token)}&next=${encodeURIComponent(nextPath)}`;
  return {
    subject: "Tu enlace de acceso a Xpansive",
    text: `Abre este enlace para entrar en Xpansive: ${url}\n\nEs de un solo uso y caduca en 15 minutos.`,
    html: `<p>Abre este enlace para entrar en Xpansive.</p><p><a href="${url}">Entrar en Xpansive</a></p><p>Es de un solo uso y caduca en 15 minutos.</p>`,
  };
}
