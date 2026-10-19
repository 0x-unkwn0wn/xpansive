import { NextRequest, NextResponse } from "next/server";
import { ProviderError } from "@/lib/ai/provider";
import type { AIProviderName } from "@/lib/types";
import { BYOK_KEY_HEADER } from "@/lib/ai/headers";

const providerErrorCodes = new Set(["INVALID_API_KEY", "RATE_LIMIT", "INSUFFICIENT_CREDITS", "MODEL_NOT_AVAILABLE", "PROVIDER_UNAVAILABLE", "INVALID_OUTPUT", "TIMEOUT", "UNKNOWN"]);

function readProviderError(error: unknown) {
  if (error instanceof ProviderError) return error;
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as { name?: unknown; code?: unknown; retryable?: unknown; statusCode?: unknown; message?: unknown };
  if (candidate.name !== "ProviderError" && !providerErrorCodes.has(String(candidate.code ?? ""))) return undefined;
  const normalized = new ProviderError(typeof candidate.message === "string" ? candidate.message : "The AI provider could not complete the request.", candidate.retryable === true, typeof candidate.statusCode === "number" ? candidate.statusCode : undefined, providerErrorCodes.has(String(candidate.code ?? "")) ? String(candidate.code) as ConstructorParameters<typeof ProviderError>[3] : "UNKNOWN");
  return normalized;
}

export function getAIKey(request: NextRequest) {
  return request.headers.get(BYOK_KEY_HEADER)?.trim() || undefined;
}

export function aiErrorResponse(error: unknown, provider: AIProviderName, operation: string) {
  const providerError = readProviderError(error);
  const code = providerError?.code ?? "UNKNOWN";
  const statusByCode: Record<string, number> = {
    INVALID_API_KEY: 401,
    RATE_LIMIT: 429,
    INSUFFICIENT_CREDITS: 402,
    MODEL_NOT_AVAILABLE: 404,
    INVALID_OUTPUT: 422,
    TIMEOUT: 504,
    PROVIDER_UNAVAILABLE: 503,
    UNKNOWN: 500,
  };
  const status = statusByCode[code] ?? 500;
  const messages: Record<string, string> = { BYOK_REQUIRED: "Connect an AI provider to continue.", INVALID_API_KEY: "Your AI provider rejected the API key.", RATE_LIMIT: "Your AI provider rate limit was reached.", INSUFFICIENT_CREDITS: "Your AI provider balance or credits are unavailable.", MODEL_NOT_AVAILABLE: "The selected model is not available for this provider.", PROVIDER_UNAVAILABLE: "Your AI provider is temporarily unavailable.", INVALID_OUTPUT: "The provider returned an invalid response.", TIMEOUT: "The provider request timed out.", UNKNOWN: "The AI provider could not complete the request." };
  const message = messages[code] ?? messages.UNKNOWN;
  const details = error instanceof Error ? { errorName: error.name, errorMessage: error.message, errorStack: error.stack } : { errorValue: String(error) };
  console.error("xpansive.ai.error", { operation, provider, code, status, ...details });
  return NextResponse.json({ error: message, code }, { status });
}
