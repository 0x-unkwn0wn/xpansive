import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { authRateLimits } from "@/lib/db/schema";

const windowMs = 15 * 60 * 1000;
const maxRequests = 5;

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function checkPersistentAuthRateLimit(request: Request, email?: string) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  const keys = [digest(`ip:${ip}|ua:${userAgent}`)];
  if (email) keys.push(digest(`email:${email}`));
  const db = getDb();
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);
  for (const key of keys) {
    const windowStartValue = windowStart.toISOString();
    const nowValue = now.toISOString();
    const current = (await db.insert(authRateLimits).values({ key, windowStartedAt: now, requestCount: 1, updatedAt: now }).onConflictDoUpdate({ target: authRateLimits.key, set: { windowStartedAt: sql`CASE WHEN ${authRateLimits.windowStartedAt} <= ${windowStartValue}::timestamptz THEN ${nowValue}::timestamptz ELSE ${authRateLimits.windowStartedAt} END`, requestCount: sql`CASE WHEN ${authRateLimits.windowStartedAt} <= ${windowStartValue}::timestamptz THEN 1 ELSE ${authRateLimits.requestCount} + 1 END`, updatedAt: now } }).returning())[0];
    if (current.requestCount > maxRequests) return { allowed: false, retryAfter: Math.ceil(windowMs / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}
