import { NextRequest, NextResponse } from "next/server";
import { AdminAccountDeletionError, deleteAccount, sessionCookieName } from "@/lib/auth";
import { authorizationErrorResponse, requireIdentity, requireSameOrigin } from "@/lib/authorization";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const user = await requireIdentity(request);
    const deleted = await deleteAccount(user.id);
    if (!deleted) return NextResponse.json({ error: "Account not found." }, { status: 404 });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookieName, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", expires: new Date(0), path: "/" });
    return response;
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof AdminAccountDeletionError) return NextResponse.json({ error: "Reassign the administrator role before deleting this account." }, { status: 409 });
    return NextResponse.json({ error: "Unable to delete the account." }, { status: 503 });
  }
}
