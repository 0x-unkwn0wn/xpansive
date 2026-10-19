import { mkdir, writeFile } from "node:fs/promises";
import { buildMultipartAlternativeEml } from "../emails/mime";
import { renderPrivateBetaInvitation } from "../emails/xpansive-private-beta-invitation";

const sample = {
  // Fictitious review data. Replace AUTH_EMAIL_FROM in the configured environment before sending.
  from: "Xpansive <{{AUTH_EMAIL_FROM}}>",
  to: "destinatario.beta@example.invalid",
  accessUrl: "https://example.invalid/auth/verify#token=TOKEN_DE_EJEMPLO_NO_VALIDO",
};

async function main() {
  const message = renderPrivateBetaInvitation({ recipientEmail: sample.to, accessUrl: sample.accessUrl });
  const eml = buildMultipartAlternativeEml({
    from: sample.from,
    to: sample.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    date: "Sun, 11 Oct 2026 12:00:00 +0200",
    messageId: "<xpansive-private-beta-example@example.invalid>",
    extraHeaders: { "X-Example-Data": "true" },
  });
  await mkdir("emails", { recursive: true });
  await writeFile("emails/xpansive-invitacion-beta.eml", eml, "utf8");
  await writeFile("emails/xpansive-invitacion-beta-preview.html", message.html, "utf8");
  console.log("Generated emails/xpansive-invitacion-beta.eml");
  console.log("Generated emails/xpansive-invitacion-beta-preview.html");
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
