import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { synthesizeExploration } from "@/lib/ai/convergence";
import { buildSynthesisContext } from "@/lib/ai/context";
import { createAIProvider } from "@/lib/ai/provider";
import { getAIKey, aiErrorResponse } from "@/lib/ai/http";
import { SynthesizeRequestSchema } from "@/lib/schemas/convergence";
import { getStoredExploration } from "@/lib/db/persistence";
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
    const body = SynthesizeRequestSchema.parse(await request.json());
    providerName = body.provider;
    const owner = await requireOwnedExploration(request, body.explorationId, { allowLegacyEditToken: true, capability: "explore" });
    if (owner.user.id !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const record = await getStoredExploration(body.explorationId);
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const hadPreviousSynthesis = Boolean(record.state.synthesis);
    const context = buildSynthesisContext(record.state);
    const synthesisCount = context.branches.length;
    await tryRecordProductEvent(user.id, "synthesis_requested", { dedupeKey: `synthesis:${operationId}:requested`, explorationId: body.explorationId, outcome: "accepted", properties: { nodeCount: synthesisCount, depth: Math.max(...context.branches.map((branch) => branch.depth), 0) } });
    const apiKey = getAIKey(request);
    if (!apiKey) return NextResponse.json({ error: "Connect an AI provider to continue.", code: "BYOK_REQUIRED" }, { status: 428 });
    const result = await synthesizeExploration(context, record.state.language, createAIProvider(body.provider, apiKey, body.model));
    const response = { ...result, sourceRevision: record.row.revision + 1, createdAt: new Date().toISOString() };
    await tryRecordProductEvent(user.id, "synthesis_completed", { dedupeKey: `synthesis:${operationId}:completed`, explorationId: body.explorationId, outcome: "success", properties: { nodeCount: synthesisCount, depth: Math.max(...context.branches.map((branch) => branch.depth), 0) } });
    if (hadPreviousSynthesis) await tryRecordProductEvent(user.id, "synthesis_regenerated", { dedupeKey: `synthesis:${operationId}:regenerated`, explorationId: body.explorationId, outcome: "success", properties: { nodeCount: synthesisCount, depth: Math.max(...context.branches.map((branch) => branch.depth), 0) } });
    return NextResponse.json(response);
  } catch (error) {
    const authorizationResponse = authorizationErrorResponse(error);
    if (authorizationResponse) return authorizationResponse;
    if (error instanceof ZodError) return NextResponse.json({ error: "The synthesis request is invalid." }, { status: 400 });
    return aiErrorResponse(error, providerName, "synthesis");
  }
}
