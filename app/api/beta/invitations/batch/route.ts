import { NextRequest, NextResponse } from "next/server";
import { sendAdminInvitation } from "@/lib/admin";
import { WaitlistEntryNotFoundError } from "@/lib/auth";
import { authorizationErrorResponse, requireAdmin } from "@/lib/authorization";
import { EmailDeliveryError, EmailDeliveryNotConfiguredError } from "@/lib/email";
import { AdminInvitationBatchSchema } from "@/lib/schemas/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(request, { csrf: true });
    const input = AdminInvitationBatchSchema.parse(await request.json());
    const results: Array<{ email: string; status: string; id?: string; error?: string }> = [];
    for (const email of [...new Set(input.emails)]) {
      try {
        const result = await sendAdminInvitation(email, actor.id, process.env.AUTH_APP_URL ?? new URL(request.url).origin, { expiresInDays: input.expiresInDays });
        results.push({ email: result.email, status: result.status, id: result.id });
      } catch (error) {
        const status = error instanceof WaitlistEntryNotFoundError ? "not_on_waitlist" : error instanceof EmailDeliveryNotConfiguredError ? "email_not_configured" : error instanceof EmailDeliveryError ? "provider_error" : "failed";
        results.push({ email, status, error: status });
      }
    }
    return NextResponse.json({ results });
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Unable to process invitations." }, { status: 400 });
  }
}
