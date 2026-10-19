import assert from "node:assert/strict";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { sendAdminInvitation } from "@/lib/admin";
import { getDb } from "@/lib/db";
import { invitations, users, waitlistEntries } from "@/lib/db/schema";
import { createAuthToken, hashAuthToken } from "@/lib/auth";

if (!process.env.DATABASE_URL) {
  const env = fs.readFileSync(".env.local", "utf8");
  const line = env.split(/\r?\n/).find((entry) => entry.startsWith("DATABASE_URL="));
  if (line) process.env.DATABASE_URL = line.slice("DATABASE_URL=".length).trim();
}

async function main() {
  const db = getDb();
  const suffix = randomBytes(8).toString("hex");
  const actorId = `admin-invitation-actor-${suffix}`;
  const email = `admin-invitation-${suffix}@example.invalid`;
  const oldInvitationId = `old-${suffix}`;
  const oldToken = createAuthToken();
  const previousFetch = globalThis.fetch;
  const previousEnv = {
    emailProvider: process.env.EMAIL_PROVIDER,
    resendApiKey: process.env.RESEND_API_KEY,
    emailFrom: process.env.AUTH_EMAIL_FROM,
    appUrl: process.env.AUTH_APP_URL,
    webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
  };

  process.env.EMAIL_PROVIDER = "resend";
  process.env.RESEND_API_KEY = "test-key";
  process.env.AUTH_EMAIL_FROM = "Xpansive <auth@example.invalid>";
  process.env.AUTH_APP_URL = "http://localhost:3000";
  process.env.RESEND_WEBHOOK_SECRET = "test-webhook-secret";
  globalThis.fetch = async () => new Response(JSON.stringify({ id: `resend-${suffix}` }), { status: 200, headers: { "Content-Type": "application/json" } });

  try {
    await db.insert(users).values({ id: actorId, email: `actor-${suffix}@example.invalid`, emailVerifiedAt: new Date(), role: "admin" });
    await db.insert(waitlistEntries).values({ email });
    await db.insert(invitations).values({ id: oldInvitationId, email, tokenHash: hashAuthToken(oldToken), expiresAt: new Date(Date.now() - 60_000) });

    const result = await sendAdminInvitation(email, actorId, "http://localhost:3000", { forceNew: true });
    assert.equal(result.status, "sent");

    const rows = await db.select().from(invitations).where(eq(invitations.email, email));
    assert.equal(rows.length, 2, "resending should preserve history and create a new invitation");
    const oldInvitation = rows.find((row) => row.id === oldInvitationId);
    const newInvitation = rows.find((row) => row.id !== oldInvitationId);
    assert.ok(oldInvitation?.revokedAt, "the expired invitation should be revoked");
    assert.ok(newInvitation, "a new invitation should be created");
    assert.notEqual(newInvitation?.tokenHash, hashAuthToken(oldToken), "the new invitation must use a new token");
    assert.ok((newInvitation?.expiresAt.getTime() ?? 0) > Date.now() + 6 * 86_400_000, "the new invitation should expire seven days from resend");
    console.log("Expired admin invitation resend creates a fresh valid token.");
  } finally {
    await db.delete(invitations).where(eq(invitations.email, email));
    await db.delete(waitlistEntries).where(eq(waitlistEntries.email, email));
    await db.delete(users).where(eq(users.id, actorId));
    globalThis.fetch = previousFetch;
    if (previousEnv.emailProvider === undefined) delete process.env.EMAIL_PROVIDER; else process.env.EMAIL_PROVIDER = previousEnv.emailProvider;
    if (previousEnv.resendApiKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previousEnv.resendApiKey;
    if (previousEnv.emailFrom === undefined) delete process.env.AUTH_EMAIL_FROM; else process.env.AUTH_EMAIL_FROM = previousEnv.emailFrom;
    if (previousEnv.appUrl === undefined) delete process.env.AUTH_APP_URL; else process.env.AUTH_APP_URL = previousEnv.appUrl;
    if (previousEnv.webhookSecret === undefined) delete process.env.RESEND_WEBHOOK_SECRET; else process.env.RESEND_WEBHOOK_SECRET = previousEnv.webhookSecret;
  }
}

main().then(() => process.exit(0)).catch((error: unknown) => { console.error(error); process.exit(1); });
