import { NextRequest, NextResponse } from "next/server";
import { sendMagicLink } from "@/lib/auth";
import { AuthEmailSchema } from "@/lib/schemas/auth";
import { checkPersistentAuthRateLimit } from "@/lib/auth-rate-limit";
import { EmailDeliveryError, EmailDeliveryNotConfiguredError } from "@/lib/email";
import { CsrfViolationError, requireSameOrigin } from "@/lib/authorization";
import { safeNextPath } from "@/lib/auth-navigation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const { email, next } = AuthEmailSchema.parse(await request.json());
    const limit = await checkPersistentAuthRateLimit(request, email);
    if (!limit.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
    await sendMagicLink(email, process.env.AUTH_APP_URL ?? new URL(request.url).origin, safeNextPath(next));
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof CsrfViolationError) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    if (error instanceof EmailDeliveryNotConfiguredError || error instanceof EmailDeliveryError) return NextResponse.json({ error: "Sign-in is temporarily unavailable." }, { status: 503 });
    return NextResponse.json({ error: "Unable to request a sign-in link." }, { status: 400 });
  }
}
