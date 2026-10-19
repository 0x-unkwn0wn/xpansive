import { randomBytes } from "node:crypto";
import { and, count, desc, eq, gt, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { adminAuditLog, betaAccess, commercialPlans, invitations, users, waitlistEntries } from "@/lib/db/schema";
import { createAuthToken, hashAuthToken, normalizeEmail, WaitlistEntryNotFoundError } from "@/lib/auth";
import { assertEmailDeliveryConfigured, invitationEmail, sendTransactionalEmail } from "@/lib/email";

type AdminTransaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
export class AdminTargetNotFoundError extends Error {}

export async function recordAdminAudit(tx: AdminTransaction, input: { actorUserId: string; action: string; targetEmail?: string; targetUserId?: string; targetInvitationId?: string }) {
  await tx.insert(adminAuditLog).values({ id: randomBytes(16).toString("hex"), actorUserId: input.actorUserId, action: input.action, targetEmail: input.targetEmail, targetUserId: input.targetUserId, targetInvitationId: input.targetInvitationId });
}

export async function sendAdminInvitation(emailInput: string, actorUserId: string, appOrigin: string, options: { expiresInDays?: number; forceNew?: boolean } = {}) {
  const email = normalizeEmail(emailInput);
  assertEmailDeliveryConfigured(appOrigin);
  const expiresInDays = options.expiresInDays ?? 7;
  const token = createAuthToken();
  const id = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  const db = getDb();
  const prepared = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${email}))`);
    const waitlist = (await tx.select().from(waitlistEntries).where(eq(waitlistEntries.email, email)).limit(1))[0];
    if (!waitlist) throw new WaitlistEntryNotFoundError("Only waitlist entries can be invited.");
    const user = (await tx.select().from(users).where(eq(users.email, email)).limit(1))[0];
    const activeAccess = user && (await tx.select({ status: betaAccess.status }).from(betaAccess).where(and(eq(betaAccess.userId, user.id), eq(betaAccess.status, "active"))).limit(1))[0];
    if (activeAccess && options.forceNew) return { status: "skipped" as const, id: "", email, expiresAt, reason: "already_active" as const };
    const current = (await tx.select().from(invitations).where(and(eq(invitations.email, email), isNull(invitations.acceptedAt), isNull(invitations.revokedAt), gt(invitations.expiresAt, new Date()))).orderBy(desc(invitations.createdAt)).limit(1))[0];
    if (activeAccess || (current && !options.forceNew)) return { status: "skipped" as const, id: current?.id ?? "", email, expiresAt: current?.expiresAt ?? expiresAt, reason: activeAccess ? "already_active" as const : "already_pending" as const };
    if (options.forceNew) {
      const revokedAt = new Date();
      const revoked = await tx.update(invitations).set({ revokedAt, revokedByUserId: actorUserId, deliveryStatus: "revoked", deliveryUpdatedAt: revokedAt }).where(and(eq(invitations.email, email), isNull(invitations.acceptedAt), isNull(invitations.revokedAt))).returning({ id: invitations.id });
      for (const old of revoked) await recordAdminAudit(tx, { actorUserId, action: "invitation_revoked_for_resend", targetEmail: email, targetInvitationId: old.id });
    } else if (current) {
      const revokedAt = new Date();
      const revoked = await tx.update(invitations).set({ revokedAt, revokedByUserId: actorUserId, deliveryStatus: "revoked", deliveryUpdatedAt: revokedAt }).where(and(eq(invitations.email, email), isNull(invitations.acceptedAt), isNull(invitations.revokedAt))).returning({ id: invitations.id });
      for (const old of revoked) await recordAdminAudit(tx, { actorUserId, action: "invitation_revoked_for_resend", targetEmail: email, targetInvitationId: old.id });
    }
    await tx.insert(invitations).values({ id, email, tokenHash: hashAuthToken(token), expiresAt, invitedByUserId: actorUserId });
    if (user) await tx.insert(betaAccess).values({ userId: user.id, status: "pending", invitedAt: new Date(), updatedAt: new Date() }).onConflictDoUpdate({ target: betaAccess.userId, set: { status: "pending", invitedAt: new Date(), revokedAt: null, updatedAt: new Date() } });
    await recordAdminAudit(tx, { actorUserId, action: options.forceNew ? "invitation_resent" : "invitation_created", targetEmail: email, targetInvitationId: id });
    return { status: "created" as const, id, email, expiresAt, token };
  });
  if (prepared.status === "skipped") return prepared;
  try {
    const message = invitationEmail(prepared.token, appOrigin);
    const sent = await sendTransactionalEmail({ ...message, to: prepared.email, appOrigin, idempotencyKey: `xpansive-invitation-${prepared.id}` });
    const acceptedAt = new Date();
    await db.update(invitations).set({ sentAt: acceptedAt, providerAcceptedAt: acceptedAt, providerMessageId: sent.providerMessageId, deliveryStatus: "accepted", providerError: null, deliveryUpdatedAt: acceptedAt }).where(eq(invitations.id, prepared.id));
    await db.update(waitlistEntries).set({ status: "invited", updatedAt: acceptedAt }).where(eq(waitlistEntries.email, prepared.email));
    return { status: "sent" as const, id: prepared.id, email: prepared.email, expiresAt: prepared.expiresAt, providerMessageId: sent.providerMessageId };
  } catch (error) {
    const providerError = error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : "provider_unavailable";
    const failedAt = new Date();
    await db.update(invitations).set({ revokedAt: failedAt, revokedByUserId: actorUserId, deliveryStatus: "failed", providerError, deliveryUpdatedAt: failedAt }).where(and(eq(invitations.id, prepared.id), isNull(invitations.acceptedAt)));
    await db.transaction(async (tx) => recordAdminAudit(tx, { actorUserId, action: "invitation_send_failed", targetEmail: prepared.email, targetInvitationId: prepared.id }));
    throw error;
  }
}

export async function revokeAdminInvitation(id: string, actorUserId: string) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const invitation = (await tx.update(invitations).set({ revokedAt: new Date(), revokedByUserId: actorUserId, deliveryStatus: "revoked", deliveryUpdatedAt: new Date() }).where(and(eq(invitations.id, id), isNull(invitations.acceptedAt), isNull(invitations.revokedAt))).returning())[0];
    if (!invitation) return null;
    await recordAdminAudit(tx, { actorUserId, action: "invitation_revoked", targetEmail: invitation.email, targetInvitationId: invitation.id });
    return invitation;
  });
}

export async function setAdminBetaAccessStatus(userId: string, status: "pending" | "active" | "revoked", actorUserId: string) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const user = (await tx.select().from(users).where(eq(users.id, userId)).limit(1))[0];
    if (!user) return null;
    const now = new Date();
    const previous = (await tx.select({ activatedAt: betaAccess.activatedAt }).from(betaAccess).where(eq(betaAccess.userId, userId)).limit(1))[0];
    const access = (await tx.update(betaAccess).set({ status, activatedAt: status === "active" ? now : status === "revoked" ? previous?.activatedAt ?? null : null, revokedAt: status === "revoked" ? now : null, updatedAt: now }).where(eq(betaAccess.userId, userId)).returning())[0];
    if (!access) return null;
    if (status === "revoked") await tx.update(invitations).set({ revokedAt: now, revokedByUserId: actorUserId, deliveryStatus: "revoked", deliveryUpdatedAt: now }).where(and(eq(invitations.email, user.email), isNull(invitations.acceptedAt), isNull(invitations.revokedAt)));
    if (status === "active") await tx.insert(commercialPlans).values({ userId, plan: "beta" }).onConflictDoNothing({ target: commercialPlans.userId });
    await recordAdminAudit(tx, { actorUserId, action: status === "revoked" ? "beta_access_revoked" : "beta_access_updated", targetEmail: user.email, targetUserId: userId });
    return access;
  });
}

export type AdminWaitlistFilters = { page: number; pageSize: number; status?: string; from?: Date; to?: Date; search?: string };

export async function getAdminWaitlist(filters: AdminWaitlistFilters) {
  const conditions = [];
  if (filters.status) conditions.push(eq(waitlistEntries.status, filters.status));
  if (filters.from) conditions.push(gte(waitlistEntries.requestedAt, filters.from));
  if (filters.to) conditions.push(lte(waitlistEntries.requestedAt, filters.to));
  if (filters.search) { const query = `%${filters.search}%`; conditions.push(or(ilike(waitlistEntries.email, query), ilike(waitlistEntries.useCase, query))); }
  const where = conditions.length ? and(...conditions) : undefined;
  const db = getDb();
  const total = Number((await db.select({ count: count() }).from(waitlistEntries).where(where))[0]?.count ?? 0);
  const rows = await db.select({ email: waitlistEntries.email, useCase: waitlistEntries.useCase, status: waitlistEntries.status, requestedAt: waitlistEntries.requestedAt, userId: users.id, accessStatus: betaAccess.status, activatedAt: betaAccess.activatedAt }).from(waitlistEntries).leftJoin(users, eq(waitlistEntries.email, users.email)).leftJoin(betaAccess, eq(users.id, betaAccess.userId)).where(where).orderBy(desc(waitlistEntries.requestedAt)).limit(filters.pageSize).offset((filters.page - 1) * filters.pageSize);
  const emails = rows.map((row) => row.email);
  const invitationRows = emails.length ? await db.select({ id: invitations.id, email: invitations.email, expiresAt: invitations.expiresAt, acceptedAt: invitations.acceptedAt, revokedAt: invitations.revokedAt, sentAt: invitations.sentAt, providerAcceptedAt: invitations.providerAcceptedAt, providerMessageId: invitations.providerMessageId, deliveryStatus: invitations.deliveryStatus, providerError: invitations.providerError, deliveredAt: invitations.deliveredAt, createdAt: invitations.createdAt }).from(invitations).where(inArray(invitations.email, emails)).orderBy(desc(invitations.createdAt)) : [];
  const latest = new Map<string, (typeof invitationRows)[number]>();
  for (const invitation of invitationRows) if (!latest.has(invitation.email)) latest.set(invitation.email, invitation);
  return { page: filters.page, pageSize: filters.pageSize, total, items: rows.map((row) => ({ ...row, invitation: latest.get(row.email) ?? null })) };
}

export async function getInvitationById(id: string) {
  return (await getDb().select().from(invitations).where(eq(invitations.id, id)).limit(1))[0] ?? null;
}
