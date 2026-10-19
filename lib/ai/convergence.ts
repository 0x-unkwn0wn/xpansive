import { buildComparePrompt, buildMergePrompt, buildSynthesisPrompt, COMPARE_SYSTEM_PROMPT, MERGE_SYSTEM_PROMPT, SYNTHESIS_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { ComparisonResultSchema, ExplorationSynthesisContentSchema, MergeContentSchema } from "@/lib/schemas/convergence";
import { ProviderError, type AIProvider } from "@/lib/ai/provider";
import type { ExplorationContext, SynthesisContext } from "@/lib/ai/context";
import type { LanguagePreference } from "@/lib/types";
import { COMPARE_MAX_OUTPUT_TOKENS, SYNTHESIS_MAX_OUTPUT_TOKENS } from "@/lib/constants";

function limitGeneratedText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  const boundary = trimmed.lastIndexOf(" ", maxLength - 1);
  return `${trimmed.slice(0, boundary > 20 ? boundary : maxLength - 1).trim()}…`;
}

function parseMergeContent(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return MergeContentSchema.parse(value);
  const candidate = value as { title?: unknown; description?: unknown };
  return MergeContentSchema.parse({
    title: limitGeneratedText(candidate.title, 90),
    description: limitGeneratedText(candidate.description, 240),
  });
}

export async function compareBranches(context: ExplorationContext, selectedNodes: Array<{ nodeId: string; title: string; description: string; path: Array<{ title: string; description: string }> }>, language: LanguagePreference, provider: AIProvider) {
  if (selectedNodes.length < 2 || selectedNodes.length > 3) throw new ProviderError("Compare requires between two and three branches.", false);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await provider.generate({ system: COMPARE_SYSTEM_PROMPT, user: buildComparePrompt(context, selectedNodes, language), maxOutputTokens: COMPARE_MAX_OUTPUT_TOKENS, timeoutMs: 12_000, parse: (value) => ComparisonResultSchema.parse(value) });
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
  throw new ProviderError("Compare failed");
}

export async function synthesizeExploration(context: SynthesisContext, language: LanguagePreference, provider: AIProvider) {
  if (!context.branches.length) throw new ProviderError("There is not enough exploration context to synthesize.", false);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await provider.generate({ system: SYNTHESIS_SYSTEM_PROMPT, user: buildSynthesisPrompt(context, language), maxOutputTokens: SYNTHESIS_MAX_OUTPUT_TOKENS, timeoutMs: 12_000, parse: (value) => ExplorationSynthesisContentSchema.parse(value) });
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
  throw new ProviderError("Synthesis failed");
}

export async function mergeBranches(context: Parameters<typeof buildMergePrompt>[0], language: LanguagePreference, provider: AIProvider) {
  if (context.branches.length !== 2 || context.branches[0].nodeId === context.branches[1].nodeId) throw new ProviderError("Merge requires exactly two different branches.", false);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await provider.generate({ system: MERGE_SYSTEM_PROMPT, user: buildMergePrompt(context, language), maxOutputTokens: 700, timeoutMs: 12_000, parse: parseMergeContent });
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
  throw new ProviderError("Merge failed");
}
