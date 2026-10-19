import { NextRequest, NextResponse } from "next/server";
import { setAdminBetaAccessStatus } from "@/lib/admin";
import { authorizationErrorResponse, requireAdmin } from "@/lib/authorization";
import { AdminAccessStatusSchema } from "@/lib/schemas/admin";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  try {
    const actor = await requireAdmin(request, { csrf: true });
    const body = AdminAccessStatusSchema.parse(await request.json());
    const { userId } = await context.params;
    const access = await setAdminBetaAccessStatus(userId, body.status, actor.id);
    return access ? NextResponse.json({ userId, status: access.status }) : NextResponse.json({ error: "User beta access not found." }, { status: 404 });
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Unable to update beta access." }, { status: 400 });
  }
}
