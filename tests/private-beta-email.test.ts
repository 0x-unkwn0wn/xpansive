import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildMultipartAlternativeEml } from "../emails/mime";
import { renderPrivateBetaInvitation } from "../emails/xpansive-private-beta-invitation";

const accessUrl = "https://example.invalid/auth/verify#token=TOKEN_DE_EJEMPLO_NO_VALIDO";
const message = renderPrivateBetaInvitation({ recipientEmail: "destinatario.beta@example.invalid", accessUrl });
const eml = buildMultipartAlternativeEml({
  from: "Xpansive <{{AUTH_EMAIL_FROM}}>",
  to: "destinatario.beta@example.invalid",
  subject: message.subject,
  text: message.text,
  html: message.html,
  date: "Sun, 11 Oct 2026 12:00:00 +0200",
  messageId: "<xpansive-private-beta-test@example.invalid>",
});

assert.match(eml, /MIME-Version: 1\.0\r?\n/);
const contentType = eml.match(/Content-Type: multipart\/alternative; boundary="([^"]+)"/);
assert.ok(contentType, "the message must declare a multipart boundary");
const boundary = contentType[1];
assert.equal(eml.split(`--${boundary}`).length, 4, "the MIME message must contain two parts and a closing boundary");
assert.match(eml, /Content-Type: text\/plain; charset="UTF-8"/);
assert.match(eml, /Content-Type: text\/html; charset="UTF-8"/);
assert.match(eml, /Acceder a la beta: https:\/\/example\.invalid\/auth\/verify#token=/);
assert.match(message.html, /href="https:\/\/example\.invalid\/auth\/verify#token=TOKEN_DE_EJEMPLO_NO_VALIDO"/);
assert.match(message.html, /Tu invitación está disponible\./);
assert.match(message.text, /API key de un proveedor compatible/);
assert.match(message.text, /lista de espera de Xpansive/);
assert.equal(readFileSync("emails/xpansive-invitacion-beta.eml", "utf8").includes("TOKEN_DE_EJEMPLO_NO_VALIDO"), true);
assert.equal(readFileSync("emails/xpansive-invitacion-beta.eml", "utf8").includes("sk-"), false);

console.log("Private beta invitation MIME and content checks passed.");
