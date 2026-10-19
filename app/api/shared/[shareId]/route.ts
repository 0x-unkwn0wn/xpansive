import { NextRequest, NextResponse } from "next/server";
import { getPublicExploration, publicExplorationState } from "@/lib/db/persistence";
import { authorizationErrorResponse, requireBetaAccess } from "@/lib/authorization";
import { explorationEventKey, tryRecordProductEvent } from "@/lib/product-events";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ shareId: string }> }) {
  let user;
  try { user = await requireBetaAccess(request, { capability: "share" }); } catch (error) { const response = authorizationErrorResponse(error); if (response) return response; return NextResponse.json({ error: "Unable to load this exploration." }, { status: 503 }); }
  const { shareId } = await context.params;
  const record = await getPublicExploration(shareId);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (record.row.userId && record.row.userId !== user.id) {
    await tryRecordProductEvent(user.id, "share_opened_by_recipient", { dedupeKey: `open:${explorationEventKey(record.row.id)}:${new Date().toISOString().slice(0, 13)}`, explorationId: record.row.id, outcome: "success", actorType: "recipient", properties: { source: "shared" } });
  }
  return NextResponse.json({ state: { ...publicExplorationState(record.state), shareId, isShared: true, remoteRevision: undefined } });
}
