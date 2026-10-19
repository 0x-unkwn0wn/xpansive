import { NextRequest, NextResponse } from "next/server";
import { AIModelSchema, AIProviderSchema } from "@/lib/schemas/ai";
import { createAIProvider } from "@/lib/ai/provider";
import { aiErrorResponse, getAIKey } from "@/lib/ai/http";
import { ZodError } from "zod";
import { getProviderDescriptor } from "@/lib/ai/catalog";
import { authorizationErrorResponse, requireBetaAccess } from "@/lib/authorization";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try { await requireBetaAccess(request, { csrf: true, capability: "explore" }); } catch (error) { const response = authorizationErrorResponse(error); if (response) return response; return NextResponse.json({ error: "Authorization is unavailable." }, { status: 503 }); }
  try {
    const raw = await request.json();
    const provider = AIProviderSchema.parse(raw.provider ?? "openai");
    const model = AIModelSchema.parse(raw.model ?? getProviderDescriptor(provider).defaultModel);
    const apiKey = getAIKey(request);
    if (!apiKey) return NextResponse.json({ error: "Connect an AI provider to continue.", code: "BYOK_REQUIRED" }, { status: 428 });
    const adapter = createAIProvider(provider, apiKey, model);
    await adapter.validate();
    let models = getProviderDescriptor(provider).models;
    try { const available = await adapter.listModels?.() ?? []; if (available.length) models = available; } catch { /* validation already succeeded; static models remain available */ }
    return NextResponse.json({ ok: true, provider, model, models });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Unsupported AI provider.", code: "UNSUPPORTED_PROVIDER" }, { status: 400 });
    return aiErrorResponse(error, "openai", "validate");
  }
}
