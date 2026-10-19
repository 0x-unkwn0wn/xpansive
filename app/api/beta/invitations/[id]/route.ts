import { NextRequest, NextResponse } from "next/server";
import { revokeAdminInvitation } from "@/lib/admin";
import { authorizationErrorResponse, requireAdmin } from "@/lib/authorization";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin(request, { csrf: true });
    const { id } = await context.params;
    const invitation = await revokeAdminInvitation(id, actor.id);
    return invitation ? NextResponse.json({ ok: true, id }) : NextResponse.json({ error: "Invitation not found or already closed." }, { status: 404 });
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Unable to revoke invitation." }, { status: 400 });
  }
}
