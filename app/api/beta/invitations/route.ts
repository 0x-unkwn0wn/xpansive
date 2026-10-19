import { NextRequest, NextResponse } from "next/server";
import { sendAdminInvitation } from "@/lib/admin";
import { InvitationSchema } from "@/lib/schemas/auth";
import { authorizationErrorResponse, requireAdmin } from "@/lib/authorization";
import { EmailDeliveryError, EmailDeliveryNotConfiguredError } from "@/lib/email";
import { WaitlistEntryNotFoundError } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(request, { csrf: true });
    const input = InvitationSchema.parse(await request.json());
    const result = await sendAdminInvitation(input.email, actor.id, process.env.AUTH_APP_URL ?? new URL(request.url).origin, { expiresInDays: input.expiresInDays });
    return NextResponse.json({ id: result.id, email: result.email, expiresAt: result.expiresAt, status: result.status });
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof EmailDeliveryNotConfiguredError || error instanceof EmailDeliveryError) return NextResponse.json({ error: "Transactional email is unavailable." }, { status: 503 });
    if (error instanceof WaitlistEntryNotFoundError) return NextResponse.json({ error: "Only waitlist entries can be invited." }, { status: 400 });
    return NextResponse.json({ error: "Unable to create invitation." }, { status: 400 });
  }
}
