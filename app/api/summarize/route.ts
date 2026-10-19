import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { summarizeJourney } from "@/lib/ai/summarize";
import { SummarizeRequestSchema } from "@/lib/schemas/summary";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAIProvider } from "@/lib/ai/provider";
import { aiErrorResponse, getAIKey } from "@/lib/ai/http";
import type { AIProviderName } from "@/lib/types";
import { authorizationErrorResponse, requireBetaAccess } from "@/lib/authorization";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try { await requireBetaAccess(request, { csrf: true, capability: "explore" }); } catch (error) { const response = authorizationErrorResponse(error); if (response) return response; return NextResponse.json({ error: "Authorization is unavailable." }, { status: 503 }); }
  if (Number(request.headers.get("content-length") ?? 0) > 24_000) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const anonymousId = request.headers.get("x-xpansive-id") ?? "anonymous";
  const limit = checkRateLimit(`${ip}:${anonymousId}:summary`);
  if (!limit.allowed) return NextResponse.json({ error: "Too many summaries. Try again shortly." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });

  let providerName: AIProviderName = "openai";
  try {
    const body = SummarizeRequestSchema.parse(await request.json());
    providerName = body.provider;
    const apiKey = getAIKey(request);
    if (!apiKey) return NextResponse.json({ error: "Connect an AI provider to continue.", code: "BYOK_REQUIRED" }, { status: 428 });
    const provider = createAIProvider(body.provider, apiKey, body.model);
    const result = await summarizeJourney(body.initialIdea, body.path, body.language, provider);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      const tooShort = error.issues.some((issue) => issue.path[0] === "path");
      return NextResponse.json({ error: tooShort ? "A journey needs at least three selected steps." : "The summary request is invalid." }, { status: 400 });
    }
    return aiErrorResponse(error, providerName, "summary");
  }
}
