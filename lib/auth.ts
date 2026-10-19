import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { adminAuditLog, authMagicLinks, authSessions, betaAccess, commercialPlans, explorations, feedbackSubmissions, invitations, productEvents, users, waitlistEntries } from "@/lib/db/schema";
import { assertEmailDeliveryConfigured, magicLinkEmail, sendTransactionalEmail } from "@/lib/email";
import { safeNextPath } from "@/lib/auth-navigation";
import { explorationEventKey } from "@/lib/product-events";

export const sessionCookieName = "xpansive-session";
const sessionMaxAge = 60 * 60 * 24 * 30;
const magicLinkMaxAge = 15 * 60 * 1000;

export type AuthenticatedUser = typeof users.$inferSelect;
export class WaitlistEntryNotFoundError extends Error {}
export class AdminAccountDeletionError extends Error {}

export function normalizeEmail(email: string) { return email.trim().toLowerCase(); }
export function createAuthToken() { return randomBytes(32).toString("base64url"); }
export function hashAuthToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
export function sessionCookieOptions() { return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: sessionMaxAge }; }

async function userForSessionToken(token: string | undefined) {
  if (!token) return null;
  const db = getDb();
  const result = await db.select({ user: users, session: authSessions }).from(authSessions).innerJoin(users, eq(authSessions.userId, users.id)).where(and(eq(authSessions.tokenHash, hashAuthToken(token)), gt(authSessions.expiresAt, new Date()))).limit(1);
  const row = result[0];
  if (!row) return null;
  await db.update(authSessions).set({ lastSeenAt: new Date() }).where(eq(authSessions.tokenHash, row.session.tokenHash));
  return row.user;
}

export async function getCurrentUserFromRequest(request: Request) {
  return userForSessionToken(request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${sessionCookieName}=`))?.slice(sessionCookieName.length + 1));
}
export async function getCurrentUser() { const store = await cookies(); return userForSessionToken(store.get(sessionCookieName)?.value); }
export async function hasActiveBetaAccess(userId: string) {
  const access = (await getDb().select({ status: betaAccess.status }).from(betaAccess).where(and(eq(betaAccess.userId, userId), eq(betaAccess.status, "active"))).limit(1))[0];
  return access?.status === "active";
}
export async function createSession(userId: string) { const token = createAuthToken(); await getDb().insert(authSessions).values({ tokenHash: hashAuthToken(token), userId, expiresAt: new Date(Date.now() + sessionMaxAge * 1000) }); return token; }
export async function revokeSession(token: string | undefined) { if (token) await getDb().delete(authSessions).where(eq(authSessions.tokenHash, hashAuthToken(token))); }

export async function createMagicLink(emailInput: string) {
  const email = normalizeEmail(emailInput);
  const db = getDb();
  const user = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0] ?? null;
  const invitation = (await db.select().from(invitations).where(and(eq(invitations.email, email), isNull(invitations.acceptedAt), isNull(invitations.revokedAt), gt(invitations.expiresAt, new Date()))).orderBy(invitations.createdAt).limit(1))[0] ?? null;
  if (!(user && await hasActiveBetaAccess(user.id)) && !invitation) return null;
  const token = createAuthToken();
  const tokenHash = hashAuthToken(token);
  await db.insert(authMagicLinks).values({ tokenHash, email, invitationId: invitation?.id, expiresAt: new Date(Date.now() + magicLinkMaxAge) });
  return { token, tokenHash, email };
}

type AuthTransaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

async function activateInvitationInTransaction(tx: AuthTransaction, invitation: typeof invitations.$inferSelect, now: Date) {
  let user = (await tx.select().from(users).where(eq(users.email, invitation.email)).limit(1))[0];
  if (!user) {
    const inserted = await tx.insert(users).values({ id: randomBytes(16).toString("hex"), email: invitation.email, emailVerifiedAt: now }).onConflictDoNothing({ target: users.email }).returning();
    user = inserted[0] ?? (await tx.select().from(users).where(eq(users.email, invitation.email)).limit(1))[0];
  } else if (!user.emailVerifiedAt) {
    user = (await tx.update(users).set({ emailVerifiedAt: now, updatedAt: now }).where(eq(users.id, user.id)).returning())[0];
  }
  await tx.insert(betaAccess).values({ userId: user.id, status: "active", invitedAt: invitation.createdAt, activatedAt: now, updatedAt: now }).onConflictDoUpdate({ target: betaAccess.userId, set: { status: "active", activatedAt: now, revokedAt: null, updatedAt: now } });
  await tx.insert(commercialPlans).values({ userId: user.id, plan: "beta" }).onConflictDoNothing({ target: commercialPlans.userId });
  await tx.update(waitlistEntries).set({ status: "joined", updatedAt: now }).where(eq(waitlistEntries.email, invitation.email));
  return user;
}

async function consumeInvitationByToken(tokenHash: string) {
  return getDb().transaction(async (tx) => {
    const now = new Date();
    const invitation = (await tx.update(invitations).set({ acceptedAt: now }).where(and(eq(invitations.tokenHash, tokenHash), isNull(invitations.acceptedAt), isNull(invitations.revokedAt), gt(invitations.expiresAt, now))).returning())[0];
    return invitation ? activateInvitationInTransaction(tx, invitation, now) : null;
  });
}

export async function consumeAuthToken(token: string) {
  const tokenHash = hashAuthToken(token);
  const invitationUser = await consumeInvitationByToken(tokenHash);
  if (invitationUser) return invitationUser;
  return getDb().transaction(async (tx) => {
    const now = new Date();
    const link = (await tx.update(authMagicLinks).set({ usedAt: now }).where(and(eq(authMagicLinks.tokenHash, tokenHash), isNull(authMagicLinks.usedAt), gt(authMagicLinks.expiresAt, now))).returning())[0];
    if (!link) return null;
    if (link.invitationId) {
      const invitation = (await tx.update(invitations).set({ acceptedAt: now }).where(and(eq(invitations.id, link.invitationId), isNull(invitations.acceptedAt), isNull(invitations.revokedAt), gt(invitations.expiresAt, now))).returning())[0];
      return invitation ? activateInvitationInTransaction(tx, invitation, now) : null;
    }
    const user = (await tx.select().from(users).where(eq(users.email, link.email)).limit(1))[0];
    if (!user || !(await tx.select({ status: betaAccess.status }).from(betaAccess).where(and(eq(betaAccess.userId, user.id), eq(betaAccess.status, "active"))).limit(1))[0]) return null;
    return user;
  });
}

export async function sendMagicLink(emailInput: string, appOrigin: string, nextPath = "/app") {
  assertEmailDeliveryConfigured(appOrigin);
  const link = await createMagicLink(emailInput);
  if (!link) return false;
  try { const message = magicLinkEmail(link.token, appOrigin, safeNextPath(nextPath)); await sendTransactionalEmail({ ...message, to: link.email, appOrigin, idempotencyKey: `xpansive-auth-${link.tokenHash}` }); return true; }
  catch (error) { await getDb().update(authMagicLinks).set({ usedAt: new Date() }).where(eq(authMagicLinks.tokenHash, link.tokenHash)); throw error; }
}

export async function deleteAccount(userId: string) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const user = (await tx.select({ id: users.id, email: users.email, role: users.role }).from(users).where(eq(users.id, userId)).limit(1))[0];
    if (!user) return false;
    if (user.role === "admin") throw new AdminAccountDeletionError("Administrators must be reassigned before deletion.");

    const owned = await tx.delete(explorations).where(eq(explorations.userId, user.id)).returning({ id: explorations.id });
    if (owned.length) {
      const ids = owned.map((row) => row.id);
      await tx.delete(productEvents).where(or(...ids.map((id) => eq(productEvents.subjectKey, explorationEventKey(id)))));
    }
    await tx.delete(authMagicLinks).where(eq(authMagicLinks.email, user.email));
    await tx.delete(invitations).where(eq(invitations.email, user.email));
    await tx.delete(waitlistEntries).where(eq(waitlistEntries.email, user.email));
    await tx.update(adminAuditLog).set({ targetEmail: null, targetUserId: null }).where(or(eq(adminAuditLog.targetEmail, user.email), eq(adminAuditLog.targetUserId, user.id)));
    await tx.delete(feedbackSubmissions).where(eq(feedbackSubmissions.userId, user.id));
    await tx.delete(users).where(eq(users.id, user.id));
    return true;
  });
}
