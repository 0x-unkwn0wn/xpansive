import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { compareBranches } from "@/lib/ai/convergence";
import { buildExplorationContext, buildSelectedBranchContext } from "@/lib/ai/context";
import { createAIProvider } from "@/lib/ai/provider";
import { getAIKey, aiErrorResponse } from "@/lib/ai/http";
import { CompareRequestSchema } from "@/lib/schemas/convergence";
import { getStoredExploration } from "@/lib/db/persistence";
import { isAccessibleNode } from "@/lib/exploration-tree";
import { authorizationErrorResponse, requireOwnedExploration, requireBetaAccess } from "@/lib/authorization";
import { tryRecordProductEvent } from "@/lib/product-events";
import type { AIProviderName } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let user;
  try { user = await requireBetaAccess(request, { csrf: true, capability: "explore" }); } catch (error) { const response = authorizationErrorResponse(error); return response ?? NextResponse.json({ error: "Authorization is unavailable." }, { status: 503 }); }
  let providerName: AIProviderName = "openai";
  const operationId = request.headers.get("x-xpansive-operation-id")?.trim() || randomBytes(16).toString("hex");
  try {
    const body = CompareRequestSchema.parse(await request.json());
    providerName = body.provider;
    const owner = await requireOwnedExploration(request, body.explorationId, { allowLegacyEditToken: true, capability: "explore" });
    if (owner.user.id !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const record = await getStoredExploration(body.explorationId);
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const selectedNodes = buildSelectedBranchContext(record.state, body.nodeIds);
    if (selectedNodes.length !== body.nodeIds.length || new Set(body.nodeIds).size !== body.nodeIds.length || body.nodeIds.some((nodeId) => !isAccessibleNode(record.state.nodes[nodeId]))) return NextResponse.json({ error: "The selected branches are invalid." }, { status: 400 });
    const depth = Math.max(...selectedNodes.map((node) => node.path.length), 0);
    await tryRecordProductEvent(user.id, "compare_started", { dedupeKey: `compare:${operationId}:started`, explorationId: body.explorationId, outcome: "accepted", properties: { branchCount: selectedNodes.length, depth } });
    const apiKey = getAIKey(request);
    if (!apiKey) return NextResponse.json({ error: "Connect an AI provider to continue.", code: "BYOK_REQUIRED" }, { status: 428 });
    const result = await compareBranches(buildExplorationContext(record.state), selectedNodes, record.state.language, createAIProvider(body.provider, apiKey, body.model));
    await tryRecordProductEvent(user.id, "compare_completed", { dedupeKey: `compare:${operationId}:completed`, explorationId: body.explorationId, outcome: "success", properties: { branchCount: selectedNodes.length, depth } });
    return NextResponse.json(result);
  } catch (error) {
    const authorizationResponse = authorizationErrorResponse(error);
    if (authorizationResponse) return authorizationResponse;
    if (error instanceof ZodError) return NextResponse.json({ error: "The compare request is invalid." }, { status: 400 });
    return aiErrorResponse(error, providerName, "compare");
  }
}
