import { NextRequest, NextResponse } from "next/server";
import { createForkFromNode, editCookieName, getPublicExploration } from "@/lib/db/persistence";
import { authorizationErrorResponse, requireBetaAccess } from "@/lib/authorization";
import { tryRecordProductEvent } from "@/lib/product-events";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ shareId: string; nodeId: string }> }) {
  let user;
  try { user = await requireBetaAccess(request, { csrf: true, capability: "fork" }); } catch (error) { const response = authorizationErrorResponse(error); return response ?? NextResponse.json({ error: "Authorization is unavailable." }, { status: 503 }); }
  const { shareId, nodeId } = await context.params;
  const source = await getPublicExploration(shareId);
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const fork = await createForkFromNode(source, nodeId, user.id);
    await tryRecordProductEvent(user.id, "node_forked", { dedupeKey: `node-fork:${fork.id}`, explorationId: fork.id, outcome: "success", actorType: "owner", properties: { source: "shared" } });
    const response = NextResponse.json({ id: fork.id, url: `/e/${fork.id}` });
    response.cookies.set(editCookieName(fork.id), fork.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    return response;
  } catch { return NextResponse.json({ error: "Unable to fork this node." }, { status: 400 }); }
}
