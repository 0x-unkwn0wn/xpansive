import assert from "node:assert/strict";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { consumeAuthToken, createAuthToken, hashAuthToken } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { authSessions, betaAccess, commercialPlans, invitations, users } from "@/lib/db/schema";

if (!process.env.DATABASE_URL) {
  const env = fs.readFileSync(".env.local", "utf8");
  const line = env.split(/\r?\n/).find((entry) => entry.startsWith("DATABASE_URL="));
  if (line) process.env.DATABASE_URL = line.slice("DATABASE_URL=".length).trim();
}

const suffix = randomBytes(8).toString("hex");
const email = `auth-test-${suffix}@example.invalid`;
const expiredEmail = `auth-expired-${suffix}@example.invalid`;
const revokedEmail = `auth-revoked-${suffix}@example.invalid`;
const usedEmail = `auth-used-${suffix}@example.invalid`;
const ids = [suffix, `${suffix}expired`, `${suffix}revoked`, `${suffix}used`];
const now = new Date();
async function main() {
  const db = getDb();
  const tokens = ids.map(() => createAuthToken());
  await db.insert(invitations).values([
    { id: ids[0], email, tokenHash: hashAuthToken(tokens[0]), expiresAt: new Date(now.getTime() + 60_000) },
    { id: ids[1], email: expiredEmail, tokenHash: hashAuthToken(tokens[1]), expiresAt: new Date(now.getTime() - 60_000) },
    { id: ids[2], email: revokedEmail, tokenHash: hashAuthToken(tokens[2]), expiresAt: new Date(now.getTime() + 60_000), revokedAt: now },
    { id: ids[3], email: usedEmail, tokenHash: hashAuthToken(tokens[3]), expiresAt: new Date(now.getTime() + 60_000), acceptedAt: now },
  ]);
  try {
    const results = await Promise.all([consumeAuthToken(tokens[0]), consumeAuthToken(tokens[0])]);
    assert.equal(results.filter(Boolean).length, 1, "an invitation must be consumed only once under concurrency");
    assert.equal(await consumeAuthToken(tokens[1]), null, "expired invitation must not be accepted");
    assert.equal(await consumeAuthToken(tokens[2]), null, "revoked invitation must not be accepted");
    assert.equal(await consumeAuthToken(tokens[3]), null, "used invitation must not be accepted");
    console.log("Authentication token expiry, revocation and atomic consumption passed.");
  } finally {
    const createdUser = (await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1))[0];
    if (createdUser) {
      await db.delete(authSessions).where(eq(authSessions.userId, createdUser.id));
      await db.delete(betaAccess).where(eq(betaAccess.userId, createdUser.id));
      await db.delete(commercialPlans).where(eq(commercialPlans.userId, createdUser.id));
      await db.delete(users).where(eq(users.id, createdUser.id));
    }
    await db.delete(invitations).where(inArray(invitations.id, ids));
  }
}

main().then(() => process.exit(0)).catch((error: unknown) => { console.error(error); process.exit(1); });
