import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { waitlistRateLimits } from "@/lib/db/schema";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;

function forwardedAddress(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
}

function rateLimitKey(request: Request) {
  const address = forwardedAddress(request);
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  return `waitlist:${createHash("sha256").update(`${address}|${userAgent}`).digest("hex")}`;
}

export async function checkPersistentWaitlistRateLimit(request: Request) {
  const now = Date.now();
  const windowStartedAt = new Date(Math.floor(now / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS);
  const windowStartedAtValue = windowStartedAt.toISOString();
  const key = rateLimitKey(request);
  const db = getDb();
  await db.insert(waitlistRateLimits).values({ key, windowStartedAt, requestCount: 1, updatedAt: new Date(now) }).onConflictDoUpdate({
    target: waitlistRateLimits.key,
    set: {
      windowStartedAt: sql`CASE WHEN ${waitlistRateLimits.windowStartedAt} < ${windowStartedAtValue} THEN ${windowStartedAtValue} ELSE ${waitlistRateLimits.windowStartedAt} END`,
      requestCount: sql`CASE WHEN ${waitlistRateLimits.windowStartedAt} < ${windowStartedAtValue} THEN 1 ELSE ${waitlistRateLimits.requestCount} + 1 END`,
      updatedAt: new Date(now),
    },
  });
  const row = (await db.select().from(waitlistRateLimits).where(eq(waitlistRateLimits.key, key)).limit(1))[0];
  if (!row) return { allowed: false, retryAfter: 60 };
  return { allowed: row.requestCount <= RATE_LIMIT_MAX_REQUESTS, retryAfter: Math.max(1, Math.ceil((row.windowStartedAt.getTime() + RATE_LIMIT_WINDOW_MS - now) / 1000)) };
}

function configuredWaitlistOrigins() {
  return (process.env.WAITLIST_ALLOWED_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);
}

export function waitlistOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return { allowed: true, origin: null };
  const configured = configuredWaitlistOrigins();
  const sameOrigin = new URL(request.url).origin;
  const allowed = configured.length ? configured.includes(origin) : origin === sameOrigin;
  return { allowed, origin: allowed ? origin : null };
}

export function waitlistCorsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return {};
  return { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "600", Vary: "Origin" };
}
