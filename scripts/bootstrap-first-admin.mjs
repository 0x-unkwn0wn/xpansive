import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

function loadLocalEnv() {
  const filePath = path.join(process.cwd(), ".env.local");
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

function normalizeEmail(value) { return value.trim().toLowerCase(); }
function hashToken(token) { return createHash("sha256").update(token).digest("hex"); }
function createToken() { return randomBytes(32).toString("base64url"); }
function createId() { return randomBytes(16).toString("hex"); }
function maskEmail(email) {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}***@${domain}`;
}

function requireBootstrapConfig() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL ? normalizeEmail(process.env.ADMIN_BOOTSTRAP_EMAIL) : "";
  const secret = process.env.ADMIN_BOOTSTRAP_SECRET;
  if (!process.env.DATABASE_URL || !email || !secret || secret.length < 32 || process.env.ADMIN_BOOTSTRAP_CONFIRMATION !== "I_UNDERSTAND_FIRST_ADMIN") {
    throw new Error("Set DATABASE_URL, ADMIN_BOOTSTRAP_EMAIL, a 32+ character ADMIN_BOOTSTRAP_SECRET, and ADMIN_BOOTSTRAP_CONFIRMATION=I_UNDERSTAND_FIRST_ADMIN.");
  }
  return email;
}

function emailConfig() {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  const origin = process.env.AUTH_APP_URL?.trim().replace(/\/$/, "");
  const missing = [];
  if (provider !== "resend") missing.push("EMAIL_PROVIDER=resend");
  if (!apiKey) missing.push("RESEND_API_KEY");
  if (!from) missing.push("AUTH_EMAIL_FROM");
  if (!origin) missing.push("AUTH_APP_URL");
  if (missing.length) throw new Error(`The bootstrap invitation is missing: ${missing.join(", ")}.`);
  return { apiKey, from, origin, replyTo: process.env.AUTH_EMAIL_REPLY_TO };
}

function invitationMessage(token, settings) {
  const url = `${settings.origin}/auth/verify#token=${encodeURIComponent(token)}`;
  return {
    subject: "Tu invitación a Xpansive",
    text: `Has sido invitado a la beta privada de Xpansive. Abre este enlace para aceptar la invitación: ${url}\n\nEl enlace caduca y solo puede usarse con el email destinatario.`,
    html: `<p>Has sido invitado a la beta privada de Xpansive.</p><p><a href="${url}">Aceptar invitación</a></p><p>El enlace caduca y solo puede usarse con el email destinatario.</p>`,
  };
}

async function sendInvitation(email, token, invitationId) {
  const settings = emailConfig();
  const message = invitationMessage(token, settings);
  let response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${settings.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `xpansive-bootstrap-invitation-${invitationId}` },
      body: JSON.stringify({ from: settings.from, to: [email], subject: message.subject, html: message.html, text: message.text, ...(settings.replyTo ? { reply_to: settings.replyTo } : {}) }),
    });
  } catch {
    throw new Error("The transactional email provider could not be reached.");
  }
  if (!response.ok) throw new Error("The transactional email provider rejected the bootstrap invitation.");
  let body = {};
  try { body = await response.json(); } catch { /* A 2xx response is still provider acceptance. */ }
  return typeof body.id === "string" ? body.id : null;
}

loadLocalEnv();
const email = requireBootstrapConfig();
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const invitationLifetimeDays = 7;

try {
  const result = await sql.begin(async (transaction) => {
    await transaction`select pg_advisory_xact_lock(hashtext('xpansive:first-admin'))`;
    const existingAdmin = await transaction`select id from users where role = 'admin' limit 1`;
    if (existingAdmin.length) throw new Error("An administrator already exists; bootstrap is one-time.");

    const user = await transaction`select id, email_verified_at from users where email = ${email} limit 1`;
    if (user.length && user[0].email_verified_at) {
      const now = new Date();
      await transaction`update users set role = 'admin', updated_at = ${now} where id = ${user[0].id}`;
      await transaction`insert into beta_access (user_id, status, activated_at, updated_at) values (${user[0].id}, 'active', ${now}, ${now}) on conflict (user_id) do update set status = 'active', revoked_at = null, activated_at = ${now}, updated_at = ${now}`;
      await transaction`insert into commercial_plans (user_id, plan) values (${user[0].id}, 'beta') on conflict (user_id) do nothing`;
      return { kind: "promoted" };
    }

    const pending = await transaction`select id, expires_at from invitations where email = ${email} and accepted_at is null and revoked_at is null and expires_at > now() order by created_at desc limit 1`;
    if (pending.length) return { kind: "pending", expiresAt: pending[0].expires_at };

    const token = createToken();
    const invitationId = createId();
    const expiresAt = new Date(Date.now() + invitationLifetimeDays * 24 * 60 * 60 * 1000);
    await transaction`insert into invitations (id, email, token_hash, expires_at, delivery_status) values (${invitationId}, ${email}, ${hashToken(token)}, ${expiresAt}, 'not_sent')`;
    return { kind: "send", invitationId, token, expiresAt };
  });

  if (result.kind === "promoted") {
    console.log(`First administrator assigned to ${maskEmail(email)}.`);
  } else if (result.kind === "pending") {
    console.log(`A bootstrap invitation is already pending for ${maskEmail(email)}; accept it before rerunning this command.`);
  } else {
    let providerAccepted = false;
    try {
      const providerMessageId = await sendInvitation(email, result.token, result.invitationId);
      providerAccepted = true;
      const sentAt = new Date();
      await sql`update invitations set sent_at = ${sentAt}, provider_accepted_at = ${sentAt}, provider_message_id = ${providerMessageId}, delivery_status = 'accepted', provider_error = null, delivery_updated_at = ${sentAt} where id = ${result.invitationId}`;
      console.log(`Bootstrap invitation sent to ${maskEmail(email)}. Accept it, then rerun npm run admin:bootstrap.`);
    } catch (error) {
      if (!providerAccepted) {
        const failedAt = new Date();
        const providerError = error instanceof Error ? error.message.slice(0, 120) : "provider_unavailable";
        await sql`update invitations set revoked_at = ${failedAt}, delivery_status = 'failed', provider_error = ${providerError}, delivery_updated_at = ${failedAt} where id = ${result.invitationId} and accepted_at is null`;
      }
      throw error;
    }
  }
} finally {
  await sql.end();
}
