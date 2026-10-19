import { AlternativeExpansionResponseSchema, ExpansionResponseSchema } from "@/lib/schemas/expansion";

export { ProviderError, createAIProvider, providerCatalog } from "@/lib/ai/gateway";
export type { AIProvider, GenerateArgs, ProviderUsage, AIErrorCode } from "@/lib/ai/types";

export const parseExpansionResponse = (value: unknown) => ExpansionResponseSchema.parse(value);
export const parseAlternativeExpansionResponse = (value: unknown) => AlternativeExpansionResponseSchema.parse(value);
