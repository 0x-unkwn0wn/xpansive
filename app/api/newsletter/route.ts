import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { waitlistEntries } from "@/lib/db/schema";
import { NewsletterSubscriptionSchema } from "@/lib/schemas/newsletter";
import { checkPersistentWaitlistRateLimit, waitlistCorsHeaders, waitlistOrigin } from "@/lib/waitlist";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  const origin = waitlistOrigin(request);
  if (!origin.allowed) return new NextResponse(null, { status: 403 });
  return new NextResponse(null, { status: 204, headers: waitlistCorsHeaders(origin.origin) });
}

export async function POST(request: NextRequest) {
  const origin = waitlistOrigin(request);
  if (!origin.allowed) return NextResponse.json({ error: "Request origin not allowed." }, { status: 403 });
  const headers = waitlistCorsHeaders(origin.origin);
  let limit: { allowed: boolean; retryAfter: number };
  try { limit = await checkPersistentWaitlistRateLimit(request); } catch { return NextResponse.json({ error: "Unable to process the request." }, { status: 503, headers }); }
  if (!limit.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { ...headers, "Retry-After": String(limit.retryAfter) } });
  if (Number(request.headers.get("content-length") ?? 0) > 4_096) return NextResponse.json({ error: "Request is too large." }, { status: 413, headers });

  try {
    const input = NewsletterSubscriptionSchema.parse(await request.json());
    if (input.website) return NextResponse.json({ ok: true }, { headers });
    const db = getDb();
    await db.insert(waitlistEntries).values({ email: input.email, useCase: input.useCase || null, invitationConsentGiven: true, invitationConsentedAt: new Date(), marketingConsentGiven: input.marketingConsent, requestedAt: new Date(), updatedAt: new Date() }).onConflictDoUpdate({ target: waitlistEntries.email, set: { useCase: input.useCase || null, invitationConsentGiven: true, marketingConsentGiven: sql`${waitlistEntries.marketingConsentGiven} OR ${input.marketingConsent}`, updatedAt: new Date() } });
    return NextResponse.json({ ok: true }, { headers });
  } catch {
    return NextResponse.json({ error: "Unable to process the request." }, { status: 400, headers });
  }
}
