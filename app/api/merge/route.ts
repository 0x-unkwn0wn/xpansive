import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { mergeBranches } from "@/lib/ai/convergence";
import { buildMergeContext } from "@/lib/ai/context";
import { createAIProvider } from "@/lib/ai/provider";
import { aiErrorResponse, getAIKey } from "@/lib/ai/http";
import { MergeRequestSchema } from "@/lib/schemas/convergence";
import { getStoredExploration } from "@/lib/db/persistence";
import { canMergeNodes, getParentIds } from "@/lib/exploration-tree";
import { authorizationErrorResponse, requireBetaAccess, requireOwnedExploration } from "@/lib/authorization";
import { tryRecordProductEvent } from "@/lib/product-events";
import type { AIProviderName } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let user;
  try { user = await requireBetaAccess(request, { csrf: true, capability: "explore" }); } catch (error) { const response = authorizationErrorResponse(error); return response ?? NextResponse.json({ error: "Authorization is unavailable." }, { status: 503 }); }
  let providerName: AIProviderName = "openai";
  const operationId = request.headers.get("x-xpansive-operation-id")?.trim() || randomBytes(16).toString("hex");
  try {
    const body = MergeRequestSchema.parse(await request.json());
    providerName = body.provider;
    const owner = await requireOwnedExploration(request, body.explorationId, { allowLegacyEditToken: true, capability: "explore" });
    if (owner.user.id !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const record = await getStoredExploration(body.explorationId);
    if (!record || !canMergeNodes(record.state, body.nodeIds)) return NextResponse.json({ error: "The two selected branches cannot be merged." }, { status: 400 });
    const duplicate = Object.values(record.state.nodes).some((node) => node.origin === "merge" && getParentIds(node).length === 2 && getParentIds(node).every((parentId) => body.nodeIds.includes(parentId)));
    if (duplicate) return NextResponse.json({ error: "These two branches have already been merged." }, { status: 409 });
    const depth = Math.max(...buildMergeContext(record.state, body.nodeIds).branches.map((branch) => branch.path.length), 0);
    await tryRecordProductEvent(user.id, "merge_started", { dedupeKey: `merge:${operationId}:started`, explorationId: body.explorationId, outcome: "accepted", properties: { branchCount: 2, depth } });
    const apiKey = getAIKey(request);
    if (!apiKey) return NextResponse.json({ error: "Connect an AI provider to continue.", code: "BYOK_REQUIRED" }, { status: 428 });
    const result = await mergeBranches(buildMergeContext(record.state, body.nodeIds), record.state.language, createAIProvider(body.provider, apiKey, body.model));
    await tryRecordProductEvent(user.id, "merge_completed", { dedupeKey: `merge:${operationId}:completed`, explorationId: body.explorationId, outcome: "success", properties: { branchCount: 2, depth } });
    return NextResponse.json(result);
  } catch (error) {
    const authorizationResponse = authorizationErrorResponse(error);
    if (authorizationResponse) return authorizationResponse;
    if (error instanceof ZodError) return NextResponse.json({ error: "The merge request is invalid." }, { status: 400 });
    return aiErrorResponse(error, providerName, "merge");
  }
}
