import { NextRequest, NextResponse } from "next/server";
import { revokeStoredShare, shareStoredExploration } from "@/lib/db/persistence";
import { authorizationErrorResponse, requireOwnedExploration } from "@/lib/authorization";
import { explorationEventKey, tryRecordProductEvent } from "@/lib/product-events";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let owner;
  try { owner = await requireOwnedExploration(request, id, { allowLegacyEditToken: true, csrf: true, capability: "share" }); } catch (error) { const response = authorizationErrorResponse(error); if (response) return response; return NextResponse.json({ error: "Not found" }, { status: 404 }); }
  try {
    const shareId = await shareStoredExploration(id);
    await tryRecordProductEvent(owner.user.id, "share", { dedupeKey: `share:${explorationEventKey(shareId)}`, explorationId: id, outcome: "success", actorType: "owner" });
    return NextResponse.json({ shareId, url: `/x/${shareId}` });
  } catch {
    return NextResponse.json({ error: "Sharing is unavailable right now." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try { await requireOwnedExploration(request, id, { allowLegacyEditToken: true, csrf: true, capability: "share" }); } catch (error) { const response = authorizationErrorResponse(error); if (response) return response; return NextResponse.json({ error: "Not found" }, { status: 404 }); }
  await revokeStoredShare(id);
  return NextResponse.json({ ok: true });
}
