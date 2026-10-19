import { NextRequest, NextResponse } from "next/server";
import { deleteStoredExploration, ExplorationRevisionError, persistExploration } from "@/lib/db/persistence";
import { PersistExplorationSchema } from "@/lib/schemas/persistence";
import { authorizationErrorResponse, AuthenticationRequiredError, BetaAccessRequiredError, ResourceOwnershipError, requireOwnedExploration } from "@/lib/authorization";
import { ExplorationSynthesisSchema } from "@/lib/schemas/convergence";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const { record } = await requireOwnedExploration(request, id, { allowLegacyEditToken: true });
    return NextResponse.json({ state: record.state, revision: record.row.revision, isShared: record.row.isShared, shareId: record.row.shareId, legacyUnclaimed: record.row.userId === null });
  } catch (error) {
    if (error instanceof ResourceOwnershipError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Authentication required.", code: "AUTHENTICATION_REQUIRED" }, { status: 401 });
    if (error instanceof BetaAccessRequiredError) return NextResponse.json({ error: "Active beta access required.", code: "BETA_ACCESS_REQUIRED" }, { status: 403 });
    return NextResponse.json({ error: "Unable to load this exploration." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try { await requireOwnedExploration(request, id, { allowLegacyEditToken: true, csrf: true }); } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Authentication required.", code: "AUTHENTICATION_REQUIRED" }, { status: 401 });
    if (error instanceof BetaAccessRequiredError) return NextResponse.json({ error: "Active beta access required.", code: "BETA_ACCESS_REQUIRED" }, { status: 403 });
    if (error instanceof ResourceOwnershipError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 64_000) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  try {
    const input = PersistExplorationSchema.parse(await request.json());
    const synthesis = input.synthesis ? ExplorationSynthesisSchema.parse(input.synthesis) : null;
    const revision = await persistExploration(id, input.revision, input.currentNodeId, input.nodes, input.journeySummary, input.journeySummaryPathKey, input.steer, input.generations, input.goal, input.constraints, input.summary, input.conclusionNodeId, input.resolutionStatus, input.resolvedAt, synthesis, input.synthesisStale ?? false);
    return NextResponse.json({ revision });
  } catch (error) {
    if (error instanceof ExplorationRevisionError) return NextResponse.json({ error: "A newer version already exists." }, { status: 409 });
    return NextResponse.json({ error: "Unable to save this exploration." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const owner = await requireOwnedExploration(request, id, { csrf: true, capability: "save" });
    const deleted = await deleteStoredExploration(id, owner.user.id);
    return deleted ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    const response = authorizationErrorResponse(error);
    if (response) return response;
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Authentication required.", code: "AUTHENTICATION_REQUIRED" }, { status: 401 });
    if (error instanceof BetaAccessRequiredError || error instanceof ResourceOwnershipError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: "Unable to delete this exploration." }, { status: 503 });
  }
}
