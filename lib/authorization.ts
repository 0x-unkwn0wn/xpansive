import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { explorations } from "@/lib/db/schema";
import { getCurrentUserFromRequest, hasActiveBetaAccess, type AuthenticatedUser } from "@/lib/auth";
import { hasCommercialCapability, type CommercialCapability } from "@/lib/commercial";
import { editCookieName, getStoredExploration, verifyEditToken, type StoredExploration } from "@/lib/db/persistence";

export class AuthenticationRequiredError extends Error {}
export class BetaAccessRequiredError extends Error {}
export class ResourceOwnershipError extends Error {}
export class CsrfViolationError extends Error {}
export class AdminRequiredError extends Error {}
export class CommercialFeatureRequiredError extends Error {}

export function isActiveBetaStatus(status: string | null | undefined) {
  return status === "active";
}

export function isAdminRole(role: string | null | undefined) {
  return role === "admin";
}

export function canEditExploration(userId: string, explorationUserId: string | null, hasLegacyEditProof: boolean) {
  return explorationUserId === userId || (explorationUserId === null && hasLegacyEditProof);
}

export async function requireIdentity(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) throw new AuthenticationRequiredError("Authentication is required.");
  return user;
}

export async function requireAdmin(request: Request, options: { csrf?: boolean } = {}) {
  if (options.csrf) requireSameOrigin(request);
  const user = await requireIdentity(request);
  if (!isAdminRole(user.role)) throw new AdminRequiredError("Administrator access is required.");
  return user;
}

export function requireSameOrigin(request: Request) {
  const expected = new Set([new URL(request.url).origin, process.env.AUTH_APP_URL?.replace(/\/$/, "")].filter(Boolean));
  const origin = request.headers.get("origin");
  if (origin && expected.has(origin)) return;
  const referer = request.headers.get("referer");
  if (referer && expected.has(new URL(referer).origin)) return;
  throw new CsrfViolationError("A same-origin request is required.");
}

export async function requireBetaAccess(request: Request, options: { csrf?: boolean; capability?: CommercialCapability } = {}) {
  if (options.csrf) requireSameOrigin(request);
  const user = await requireIdentity(request);
  if (!await hasActiveBetaAccess(user.id)) throw new BetaAccessRequiredError("Active beta access is required.");
  if (options.capability && !await hasCommercialCapability(user.id, options.capability)) throw new CommercialFeatureRequiredError("This feature is not enabled for the commercial plan.");
  return user;
}

export function authorizationErrorResponse(error: unknown) {
  if (error instanceof AuthenticationRequiredError) return Response.json({ error: "Authentication required.", code: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  if (error instanceof BetaAccessRequiredError) return Response.json({ error: "Active beta access required.", code: "BETA_ACCESS_REQUIRED" }, { status: 403 });
  if (error instanceof AdminRequiredError) return Response.json({ error: "Administrator access required.", code: "ADMIN_REQUIRED" }, { status: 403 });
  if (error instanceof CommercialFeatureRequiredError) return Response.json({ error: "This feature is not enabled for the current plan.", code: "COMMERCIAL_FEATURE_REQUIRED" }, { status: 403 });
  if (error instanceof ResourceOwnershipError) return Response.json({ error: "Not found." }, { status: 404 });
  if (error instanceof CsrfViolationError) return Response.json({ error: "Invalid request origin.", code: "CSRF_REJECTED" }, { status: 403 });
  return null;
}

export async function requireOwnedExploration(request: Request, id: string, options: { allowLegacyEditToken?: boolean; csrf?: boolean; capability?: CommercialCapability } = {}) {
  const user = await requireBetaAccess(request, { csrf: options.csrf, capability: options.capability ?? (options.csrf ? "save" : undefined) });
  const record = await getStoredExploration(id);
  if (!record) throw new ResourceOwnershipError("Exploration not found.");
  const editToken = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${editCookieName(id)}=`))?.slice(editCookieName(id).length + 1);
  const legacyEditProof = options.allowLegacyEditToken === true && !record.row.userId && verifyEditToken(record.row.editTokenHash, editToken);
  if (!canEditExploration(user.id, record.row.userId, legacyEditProof)) throw new ResourceOwnershipError("Exploration does not belong to this user.");
  return { user, record, legacy: legacyEditProof };
}

export async function claimLegacyExploration(request: Request, id: string) {
  const user = await requireBetaAccess(request, { csrf: true, capability: "save" });
  const record = await getStoredExploration(id);
  if (!record) throw new ResourceOwnershipError("Exploration not found.");
  const editToken = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${editCookieName(id)}=`))?.slice(editCookieName(id).length + 1);
  if (!record.row.userId && verifyEditToken(record.row.editTokenHash, editToken)) {
    const updated = (await getDb().update(explorations).set({ userId: user.id, updatedAt: new Date() }).where(and(eq(explorations.id, id), isNull(explorations.userId))).returning())[0];
    if (!updated) throw new ResourceOwnershipError("This exploration has already been claimed.");
    return { user, record: updated ? { ...record, row: updated } as StoredExploration : record };
  }
  throw new ResourceOwnershipError("A valid edit permission is required to claim this exploration.");
}

export async function getPageAccess(options: { capability?: CommercialCapability } = {}) {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  if (!user || !await hasActiveBetaAccess(user.id)) return null;
  if (options.capability && !await hasCommercialCapability(user.id, options.capability)) return null;
  return user as AuthenticatedUser;
}

export async function getAdminPageAccess() {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  return user?.role === "admin" ? user as AuthenticatedUser : null;
}
