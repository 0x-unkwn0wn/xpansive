import { NextRequest, NextResponse } from "next/server";
import { consumeAuthToken, createSession, sessionCookieName, sessionCookieOptions } from "@/lib/auth";
import { checkPersistentAuthRateLimit } from "@/lib/auth-rate-limit";
import { CsrfViolationError, requireSameOrigin } from "@/lib/authorization";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/auth/verify", request.url));
}

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const body = await request.json() as { token?: unknown };
    if (typeof body.token !== "string" || body.token.length < 20 || body.token.length > 200) return NextResponse.json({ error: "Invalid or expired link." }, { status: 400 });
    const limit = await checkPersistentAuthRateLimit(request);
    if (!limit.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
    const user = await consumeAuthToken(body.token);
    if (!user) return NextResponse.json({ error: "Invalid or expired link." }, { status: 400 });
    const session = await createSession(user.id);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookieName, session, sessionCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof CsrfViolationError) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    return NextResponse.json({ error: "Unable to verify this link." }, { status: 400 });
  }
}
