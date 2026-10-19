import { NextRequest, NextResponse } from "next/server";
import { createForkFromNode, editCookieName } from "@/lib/db/persistence";
import { authorizationErrorResponse, requireOwnedExploration } from "@/lib/authorization";
import { tryRecordProductEvent } from "@/lib/product-events";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const nodeId = request.headers.get("x-xpansive-node-id") ?? "";
  let owner;
  try { owner = await requireOwnedExploration(request, id, { csrf: true, capability: "fork" }); } catch (error) { const response = authorizationErrorResponse(error); return response ?? NextResponse.json({ error: "Authorization is unavailable." }, { status: 503 }); }
  try {
    const fork = await createForkFromNode(owner.record, nodeId, owner.user.id);
    await tryRecordProductEvent(owner.user.id, "node_forked", { dedupeKey: `node-fork:${fork.id}`, explorationId: fork.id, outcome: "success", actorType: "owner" });
    const response = NextResponse.json({ id: fork.id, url: `/e/${fork.id}` });
    response.cookies.set(editCookieName(fork.id), fork.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    return response;
  } catch { return NextResponse.json({ error: "Unable to fork this node." }, { status: 400 }); }
}
