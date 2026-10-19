"use client";

import { AlternativeExpansionResponseSchema, ExpansionResponseSchema } from "@/lib/schemas/expansion";
import { JourneySummarySchema } from "@/lib/schemas/summary";
import { ComparisonResultSchema, ExplorationSynthesisSchema } from "@/lib/schemas/convergence";
import { BYOK_KEY_HEADER } from "@/lib/ai/headers";
import { BYOK_REQUIRED_CODE, hasConfiguredApiKey } from "@/lib/ai/credentials";
import type { AIProviderName, ComparisonResult, ConnectedAIProvider, ExpansionOption, ExplorationSynthesis, JourneySummary, LanguagePreference, ProviderModel } from "@/lib/types";
import type { ExplorationContext } from "@/lib/ai/context";

export class AIClientError extends Error {
  constructor(message: string, public readonly code?: string, public readonly status?: number) {
    super(message);
    this.name = "AIClientError";
  }
}

function requireConfiguredApiKey(config: AIClientConfig) {
  if (!hasConfiguredApiKey({ apiKey: config.apiKey })) {
    throw new AIClientError("", BYOK_REQUIRED_CODE);
  }
}

export type AIClientConfig = { provider: AIProviderName; model: string; apiKey: string; anonymousId: string };
type AIResponsePayload = { error?: string; code?: string };

function headers(config: AIClientConfig, explorationId?: string, operationId?: string) {
  const value: Record<string, string> = { "Content-Type": "application/json", "x-xpansive-id": config.anonymousId };
  value[BYOK_KEY_HEADER] = config.apiKey;
  if (explorationId) value["x-xpansive-exploration-id"] = explorationId;
  if (operationId) value["x-xpansive-operation-id"] = operationId;
  return value;
}

async function readResponse<T>(response: Response, parse: (value: unknown) => T) {
  const payload = await response.json() as AIResponsePayload;
  if (!response.ok) throw new AIClientError(payload.error ?? "The AI service is temporarily unavailable.", payload.code, response.status);
  return { result: parse(payload) };
}

export async function requestExpansion(input: { initialIdea: string; path: ExpansionOption[]; current: string; language: LanguagePreference; previouslyExplored: string[]; rejectedOptions: ExpansionOption[]; currentOptions?: ExpansionOption[]; generation?: "initial" | "alternative"; steer?: string; context?: ExplorationContext; explorationId?: string; operationId?: string }, config: AIClientConfig) {
  requireConfiguredApiKey(config);
  const { explorationId, operationId, ...payload } = input;
  const requestOperationId = operationId ?? crypto.randomUUID();
  const response = await fetch("/api/expand", { method: "POST", headers: headers(config, explorationId, requestOperationId), body: JSON.stringify({ ...payload, provider: config.provider, model: config.model }) });
  return readResponse(response, (payload) => input.generation === "alternative" ? AlternativeExpansionResponseSchema.parse(payload) : ExpansionResponseSchema.parse(payload));
}

export async function requestSummary(input: { initialIdea: string; path: ExpansionOption[]; language: LanguagePreference }, config: AIClientConfig): Promise<{ result: JourneySummary }> {
  requireConfiguredApiKey(config);
  const response = await fetch("/api/summarize", { method: "POST", headers: headers(config), body: JSON.stringify({ ...input, provider: config.provider, model: config.model }) });
  return readResponse(response, (payload) => JourneySummarySchema.parse(payload));
}

export async function requestComparison(input: { explorationId: string; nodeIds: string[]; selectedNodes: Array<{ nodeId: string; title: string; description: string; path: Array<{ title: string; description: string }> }> }, config: AIClientConfig): Promise<{ result: ComparisonResult }> {
  requireConfiguredApiKey(config);
  const response = await fetch("/api/compare", { method: "POST", headers: headers(config, input.explorationId, crypto.randomUUID()), body: JSON.stringify({ ...input, provider: config.provider, model: config.model }) });
  return readResponse(response, (payload) => ComparisonResultSchema.parse(payload));
}

export async function requestSynthesis(input: { explorationId: string }, config: AIClientConfig): Promise<{ result: ExplorationSynthesis }> {
  requireConfiguredApiKey(config);
  const response = await fetch("/api/synthesize", { method: "POST", headers: headers(config, input.explorationId, crypto.randomUUID()), body: JSON.stringify({ ...input, provider: config.provider, model: config.model }) });
  return readResponse(response, (payload) => ExplorationSynthesisSchema.parse(payload));
}

export async function requestMerge(input: { explorationId: string; nodeIds: string[] }, config: AIClientConfig): Promise<{ result: { title: string; description: string } }> {
  requireConfiguredApiKey(config);
  const response = await fetch("/api/merge", { method: "POST", headers: headers(config, input.explorationId, crypto.randomUUID()), body: JSON.stringify({ ...input, provider: config.provider, model: config.model }) });
  const { MergeContentSchema } = await import("@/lib/schemas/convergence");
  return readResponse(response, (payload) => MergeContentSchema.parse(payload));
}

export async function validateAIKey(apiKey: string, provider: AIProviderName, model: string, anonymousId: string): Promise<ConnectedAIProvider> {
  const response = await fetch("/api/ai/validate", { method: "POST", headers: { "Content-Type": "application/json", "x-xpansive-id": anonymousId, [BYOK_KEY_HEADER]: apiKey }, body: JSON.stringify({ provider, model }) });
  const payload = await response.json() as { error?: string; code?: string; model?: string; models?: ProviderModel[] };
  if (!response.ok) throw new AIClientError(payload.error ?? "The provider could not be connected.", payload.code, response.status);
  const models = payload.models?.length ? payload.models : [{ id: model, label: model }];
  return { provider, model: payload.model ?? model, apiKey, maskedKey: maskApiKey(apiKey), models };
}

export function maskApiKey(apiKey: string) { return apiKey.length <= 8 ? "••••••••" : `${apiKey.slice(0, 3)}••••••••••••${apiKey.slice(-4)}`; }
