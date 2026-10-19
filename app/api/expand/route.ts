import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { expand, expandAlternative } from "@/lib/ai/expand";
import { ExpandRequestSchema } from "@/lib/schemas/expansion";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAIProvider } from "@/lib/ai/provider";
import { aiErrorResponse, getAIKey } from "@/lib/ai/http";
import { ZodError } from "zod";
import type { AIProviderName } from "@/lib/types";
import { authorizationErrorResponse, requireBetaAccess } from "@/lib/authorization";
import { getStoredExploration } from "@/lib/db/persistence";
import { tryRecordProductEvent } from "@/lib/product-events";
import { getExplorationExploredOptions, getExplorationNegativeOptions } from "@/lib/exploration-tree";
import type { ExpansionOption } from "@/lib/types";

export const runtime = "nodejs";

function operationId(request: NextRequest) {
  const candidate = request.headers.get("x-xpansive-operation-id")?.trim();
  return candidate && /^[A-Za-z0-9_-]{16,128}$/.test(candidate) ? candidate : randomBytes(16).toString("hex");
}

function errorCategory(error: unknown) {
  if (error instanceof ZodError || error instanceof SyntaxError) return "invalid_request" as const;
  if (error instanceof Error && "code" in error && error.code === "BYOK_REQUIRED") return "byok_required" as const;
  if (error instanceof Error && "code" in error && error.code === "RATE_LIMITED") return "rate_limited" as const;
  return "provider" as const;
}

function mergeOptions(...lists: ExpansionOption[][]) {
  const seen = new Set<string>();
  return lists.flat().filter((option) => {
    const key = `${option.title.trim().toLocaleLowerCase()}::${option.description.trim().toLocaleLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function POST(request: NextRequest) {
  let user;
  try { user = await requireBetaAccess(request, { csrf: true, capability: "explore" }); } catch (error) { const response = authorizationErrorResponse(error); if (response) return response; return NextResponse.json({ error: "Authorization is unavailable." }, { status: 503 }); }
  // The request carries the exploration's global negative memory so that
  // discarded ideas from other branches participate in validation as well.
  if (Number(request.headers.get("content-length") ?? 0) > 96_000) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const anonymousId = request.headers.get("x-xpansive-id") ?? "anonymous";
  const limit = checkRateLimit(`${ip}:${anonymousId}`);
  if (!limit.allowed) return NextResponse.json({ error: "Too many expansions. Try again shortly." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });

  let providerName: AIProviderName = "openai";
  const eventOperationId = operationId(request);
  let eventVariant: "initial" | "alternative" | "steer" = "initial";
  let eventExplorationId: string | undefined;
  let eventReady = false;
  let persistedNegativeOptions: ExpansionOption[] = [];
  let persistedExploredTitles: string[] = [];
  try {
    const body = ExpandRequestSchema.parse(await request.json());
    providerName = body.provider;
    eventVariant = body.generation === "alternative" ? "alternative" : body.steer ? "steer" : "initial";
    const candidateExplorationId = request.headers.get("x-xpansive-exploration-id")?.trim();
    if (candidateExplorationId && /^[a-f0-9]{32}$/.test(candidateExplorationId)) {
      const record = await getStoredExploration(candidateExplorationId);
      if (record?.row.userId === user.id) {
        eventExplorationId = candidateExplorationId;
        persistedNegativeOptions = getExplorationNegativeOptions(record.state);
        persistedExploredTitles = getExplorationExploredOptions(record.state).map((option) => option.title);
      }
    }
    eventReady = true;
    await tryRecordProductEvent(user.id, "generation_requested", { dedupeKey: `generation:${eventOperationId}:requested`, explorationId: eventExplorationId, outcome: "accepted", properties: { variant: eventVariant } });
    const apiKey = getAIKey(request);
    if (!apiKey) {
      await tryRecordProductEvent(user.id, "generation_failed", { dedupeKey: `generation:${eventOperationId}:failed`, explorationId: eventExplorationId, outcome: "error", properties: { variant: eventVariant, errorCategory: "byok_required" } });
      return NextResponse.json({ error: "Connect an AI provider to continue.", code: "BYOK_REQUIRED" }, { status: 428 });
    }
    const provider = createAIProvider(body.provider, apiKey, body.model);
    const rejectedOptions = mergeOptions(persistedNegativeOptions, body.rejectedOptions ?? []);
    const previouslyExplored = [...new Set([...persistedExploredTitles, ...(body.previouslyExplored ?? [])])];
    const result = body.generation === "alternative"
      ? await expandAlternative(body.initialIdea, body.path, previouslyExplored, body.language, body.currentOptions ?? [], rejectedOptions, provider, body.steer, body.context)
      : await expand(body.initialIdea, body.path, previouslyExplored, body.language, rejectedOptions, provider, body.steer, body.context);
    await tryRecordProductEvent(user.id, "generation_succeeded", { dedupeKey: `generation:${eventOperationId}:succeeded`, explorationId: eventExplorationId, outcome: "success", properties: { variant: eventVariant } });
    await tryRecordProductEvent(user.id, "branch_generated", { dedupeKey: `generation:${eventOperationId}:branches`, explorationId: eventExplorationId, outcome: "success", properties: { variant: eventVariant } });
    if (eventVariant === "alternative") await tryRecordProductEvent(user.id, "alternative_generation_succeeded", { dedupeKey: `generation:${eventOperationId}:alternative`, explorationId: eventExplorationId, outcome: "success", properties: { variant: "alternative" } });
    if (eventVariant === "steer") {
      await tryRecordProductEvent(user.id, "steer_generation_succeeded", { dedupeKey: `generation:${eventOperationId}:steer`, explorationId: eventExplorationId, outcome: "success", properties: { variant: "steer" } });
      await tryRecordProductEvent(user.id, "steer_applied", { dedupeKey: `generation:${eventOperationId}:applied`, explorationId: eventExplorationId, outcome: "success" });
    }
    await tryRecordProductEvent(user.id, "first_generation_success", { dedupeKey: "first_generation_success", explorationId: eventExplorationId, outcome: "success", properties: { variant: eventVariant } });
    return NextResponse.json(result);
  } catch (error) {
    if (eventReady) await tryRecordProductEvent(user.id, "generation_failed", { dedupeKey: `generation:${eventOperationId}:failed`, explorationId: eventExplorationId, outcome: "error", properties: { variant: eventVariant, errorCategory: errorCategory(error) } });
    if (error instanceof ZodError || error instanceof SyntaxError) return NextResponse.json({ error: "The request is invalid.", code: "INVALID_REQUEST" }, { status: 400 });
    return aiErrorResponse(error, providerName, "expand");
  }
}
