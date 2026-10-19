import { NextRequest, NextResponse } from "next/server";
import { getInvitationById, sendAdminInvitation } from "@/lib/admin";
import { authorizationErrorResponse, requireAdmin } from "@/lib/authorization";
import { EmailDeliveryError, EmailDeliveryNotConfiguredError } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin(request, { csrf: true });
    const { id } = await context.params;
    const previous = await getInvitationById(id);
    if (!previous) return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    const result = await sendAdminInvitation(previous.email, actor.id, process.env.AUTH_APP_URL ?? new URL(request.url).origin, { expiresInDays: 7, forceNew: true });
    return NextResponse.json({ id: result.id, email: result.email, expiresAt: result.expiresAt, status: result.status });
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof EmailDeliveryNotConfiguredError || error instanceof EmailDeliveryError) return NextResponse.json({ error: "Transactional email is unavailable." }, { status: 503 });
    return NextResponse.json({ error: "Unable to resend invitation." }, { status: 400 });
  }
}
