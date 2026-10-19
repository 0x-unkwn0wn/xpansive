import { NextRequest, NextResponse } from "next/server";
import { createForkFromExploration, editCookieName, getPublicExploration, publicExplorationState } from "@/lib/db/persistence";
import { authorizationErrorResponse, requireBetaAccess } from "@/lib/authorization";
import { explorationEventKey } from "@/lib/product-events";

export const runtime = "nodejs";

export async function POST(_request: NextRequest, context: { params: Promise<{ shareId: string }> }) {
  let user;
  try { user = await requireBetaAccess(_request, { csrf: true, capability: "fork" }); } catch (error) { const response = authorizationErrorResponse(error); if (response) return response; return NextResponse.json({ error: "Authorization is unavailable." }, { status: 503 }); }
  const { shareId } = await context.params;
  const source = await getPublicExploration(shareId);
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const fork = await createForkFromExploration({ ...source, state: publicExplorationState(source.state) }, user.id);
    const { tryRecordProductEvent } = await import("@/lib/product-events");
    await tryRecordProductEvent(user.id, "fork", { dedupeKey: `fork:${explorationEventKey(fork.id)}`, explorationId: fork.id, outcome: "success", actorType: "owner", properties: { source: "shared" } });
    const response = NextResponse.json({ id: fork.id, url: `/e/${fork.id}` });
    response.cookies.set(editCookieName(fork.id), fork.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Unable to fork this exploration." }, { status: 503 });
  }
}
