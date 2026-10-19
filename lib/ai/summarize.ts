import { JourneySummarySchema } from "@/lib/schemas/summary";
import { buildJourneySummaryPrompt, JOURNEY_SUMMARY_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { ProviderError, type AIProvider } from "@/lib/ai/provider";
import { SUMMARY_MAX_OUTPUT_TOKENS } from "@/lib/constants";
import type { ExpansionOption, LanguagePreference } from "@/lib/types";

async function requestSummary(initialIdea: string, path: ExpansionOption[], language: LanguagePreference, provider: AIProvider) {
  return provider.generate({
    system: JOURNEY_SUMMARY_SYSTEM_PROMPT,
    user: buildJourneySummaryPrompt(initialIdea, path, language),
    maxOutputTokens: SUMMARY_MAX_OUTPUT_TOKENS,
    timeoutMs: 12_000,
    parse: (value) => JourneySummarySchema.parse(value),
  });
}

export async function summarizeJourney(initialIdea: string, path: ExpansionOption[], language: LanguagePreference = "auto", provider: AIProvider) {
  if (path.length < 3) throw new ProviderError("A journey needs at least three selected steps.");
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await requestSummary(initialIdea, path, language, provider);
    } catch (error) {
      if (!(error instanceof ProviderError) || !error.retryable || attempt === 1) throw error;
    }
  }
  throw new ProviderError("Journey summary failed");
}
