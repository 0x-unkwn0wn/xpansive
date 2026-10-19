import { NextRequest, NextResponse } from "next/server";
import { ExplorationEventRequestSchema } from "@/lib/schemas/product-events";
import { authorizationErrorResponse, requireOwnedExploration } from "@/lib/authorization";
import { tryRecordProductEvent } from "@/lib/product-events";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const owner = await requireOwnedExploration(request, id, { csrf: true, capability: "explore" });
    const input = ExplorationEventRequestSchema.parse(await request.json());
    const recorded = await tryRecordProductEvent(owner.user.id, input.eventName, { dedupeKey: `client:${input.operationId}`, explorationId: id, outcome: "success", actorType: "owner", properties: input.eventName === "steer_submitted" ? { variant: "steer" } : undefined });
    return NextResponse.json({ ok: recorded });
  } catch (error) {
    const response = authorizationErrorResponse(error);
    return response ?? NextResponse.json({ error: "Unable to record this event." }, { status: 400 });
  }
}
