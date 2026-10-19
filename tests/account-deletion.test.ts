import assert from "node:assert/strict";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { deleteAccount } from "@/lib/auth";
import { createStoredExploration } from "@/lib/db/persistence";
import { getDb } from "@/lib/db";
import { authSessions, betaAccess, commercialPlans, explorations, feedbackSubmissions, productEvents, users, waitlistEntries } from "@/lib/db/schema";
import { explorationEventKey } from "@/lib/product-events";

if (!process.env.DATABASE_URL) {
  const env = fs.readFileSync(".env.local", "utf8");
  const line = env.split(/\r?\n/).find((entry) => entry.startsWith("DATABASE_URL="));
  if (line) process.env.DATABASE_URL = line.slice("DATABASE_URL=".length).trim();
}

async function main() {
  const db = getDb();
  const suffix = randomBytes(8).toString("hex");
  const userId = `account-delete-${suffix}`;
  const email = `account-delete-${suffix}@example.invalid`;
  await db.insert(users).values({ id: userId, email, emailVerifiedAt: new Date() });
  await db.insert(betaAccess).values({ userId, status: "active", activatedAt: new Date() });
  await db.insert(commercialPlans).values({ userId, plan: "beta" });
  await db.insert(waitlistEntries).values({ email });
  const exploration = await createStoredExploration("delete me", "en", userId);
  await db.insert(authSessions).values({ tokenHash: `session-${suffix}`, userId, expiresAt: new Date(Date.now() + 60_000) });
  await db.insert(productEvents).values({ id: `event-${suffix}`, userId, eventName: "exploration_started", subjectKey: explorationEventKey(exploration.id), properties: {} });
  await db.insert(feedbackSubmissions).values({ id: `feedback-${suffix}`, userId, message: "delete me" });

  try {
    assert.equal(await deleteAccount(userId), true);
    assert.equal((await db.select().from(users).where(eq(users.id, userId))).length, 0);
    assert.equal((await db.select().from(explorations).where(eq(explorations.id, exploration.id))).length, 0);
    assert.equal((await db.select().from(productEvents).where(eq(productEvents.userId, userId))).length, 0);
    assert.equal((await db.select().from(feedbackSubmissions).where(eq(feedbackSubmissions.userId, userId))).length, 0);
    assert.equal((await db.select().from(waitlistEntries).where(eq(waitlistEntries.email, email))).length, 0);
    console.log("Account deletion cascade and scoped event cleanup passed.");
  } finally {
    await db.delete(productEvents).where(eq(productEvents.userId, userId));
    await db.delete(feedbackSubmissions).where(eq(feedbackSubmissions.userId, userId));
    await db.delete(authSessions).where(eq(authSessions.userId, userId));
    await db.delete(betaAccess).where(eq(betaAccess.userId, userId));
    await db.delete(commercialPlans).where(eq(commercialPlans.userId, userId));
    await db.delete(explorations).where(eq(explorations.id, exploration.id));
    await db.delete(waitlistEntries).where(eq(waitlistEntries.email, email));
    await db.delete(users).where(eq(users.id, userId));
  }
}

main().then(() => process.exit(0)).catch((error: unknown) => { console.error(error); process.exit(1); });
