import { NextRequest, NextResponse } from "next/server";
import { CreateExplorationSchema } from "@/lib/schemas/persistence";
import { createStoredExploration, createStoredExplorationFromState, editCookieName, listOwnedExplorations } from "@/lib/db/persistence";
import { authorizationErrorResponse, requireBetaAccess } from "@/lib/authorization";
import { explorationEventKey, tryRecordProductEvent } from "@/lib/product-events";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await requireBetaAccess(request, { capability: "save" });
    return NextResponse.json({ explorations: await listOwnedExplorations(user.id) });
  } catch (error) {
    const response = authorizationErrorResponse(error);
    return response ?? NextResponse.json({ error: "Unable to load explorations." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  let user;
  try { user = await requireBetaAccess(request, { csrf: true, capability: "save" }); } catch (error) { const response = authorizationErrorResponse(error); if (response) return response; return NextResponse.json({ error: "Persistence is unavailable." }, { status: 503 }); }
  if (Number(request.headers.get("content-length") ?? 0) > 256_000) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  try {
    const input = CreateExplorationSchema.parse(await request.json());
    const created = input.state ? await createStoredExplorationFromState(input.state, user.id) : await createStoredExploration(input.initialIdea, input.language, user.id, input.goal, input.constraints);
    await tryRecordProductEvent(user.id, "exploration_started", { dedupeKey: `start:${explorationEventKey(created.id)}`, explorationId: created.id, outcome: "success" });
    const response = NextResponse.json({ id: created.id });
    response.cookies.set(editCookieName(created.id), created.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Unable to start this exploration." }, { status: 503 });
  }
}
