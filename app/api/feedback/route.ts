import { NextRequest, NextResponse } from "next/server";
import { checkPersistentAuthRateLimit } from "@/lib/auth-rate-limit";
import { authorizationErrorResponse, requireBetaAccess } from "@/lib/authorization";
import { createFeedback } from "@/lib/product-events";
import { FeedbackSchema } from "@/lib/schemas/feedback";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await requireBetaAccess(request, { csrf: true });
    const limit = await checkPersistentAuthRateLimit(request, `feedback:${user.id}`);
    if (!limit.allowed) return NextResponse.json({ error: "Too many feedback submissions." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
    const { message } = FeedbackSchema.parse(await request.json());
    await createFeedback(user.id, message);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Unable to save feedback." }, { status: 400 });
  }
}
