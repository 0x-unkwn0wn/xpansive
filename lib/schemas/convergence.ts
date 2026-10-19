import { z } from "zod";
import { AIModelSchema, AIProviderSchema } from "@/lib/schemas/ai";

const TextList = z.array(z.string().trim().min(1).max(360)).max(8);
const SelectedNode = z.object({
  nodeId: z.string().min(1).max(80),
  title: z.string().trim().min(1).max(280),
  description: z.string().max(240),
  path: z.array(z.object({ title: z.string().max(280), description: z.string().max(240) })).max(12),
});

export const ComparisonEntrySchema = z.object({
  nodeId: z.string().min(1).max(80),
  title: z.string().trim().min(1).max(280),
  strengths: TextList,
  weaknesses: TextList,
  risks: TextList,
  assumptions: TextList,
});
export const ComparisonResultSchema = z.object({
  comparisons: z.array(ComparisonEntrySchema).min(2).max(3),
  keyDifferences: TextList,
  tradeOffs: TextList,
  situations: TextList,
});

export const CompareRequestSchema = z.object({
  explorationId: z.string().regex(/^[a-f0-9]{32}$/),
  nodeIds: z.array(z.string().min(1).max(80)).min(2).max(3),
  selectedNodes: z.array(SelectedNode).min(2).max(3),
  provider: AIProviderSchema,
  model: AIModelSchema,
});

export const SynthesisRecommendationSchema = z.object({ nodeId: z.string().min(1).max(80).optional(), title: z.string().trim().min(1).max(280), rationale: z.string().trim().min(10).max(600) });
export const ExplorationSynthesisContentSchema = z.object({
  whatWasExplored: z.string().trim().min(20).max(1800),
  strongestDirections: z.array(z.object({ nodeId: z.string().min(1).max(80).optional(), title: z.string().trim().min(1).max(280), reason: z.string().trim().min(10).max(500) })).max(6),
  keyTradeoffs: TextList,
  importantAssumptions: TextList,
  risks: TextList,
  openQuestions: TextList,
  recommendedDirection: SynthesisRecommendationSchema,
  nextActions: TextList,
});
export const ExplorationSynthesisSchema = ExplorationSynthesisContentSchema.extend({
  sourceRevision: z.number().int().min(0),
  createdAt: z.string().min(1).max(80),
});

export const SynthesizeRequestSchema = z.object({
  explorationId: z.string().regex(/^[a-f0-9]{32}$/),
  provider: AIProviderSchema,
  model: AIModelSchema,
});

export const MergeContentSchema = z.object({
  title: z.string().trim().min(2).max(90),
  description: z.string().trim().min(5).max(240),
});

export const MergeRequestSchema = z.object({
  explorationId: z.string().regex(/^[a-f0-9]{32}$/),
  nodeIds: z.array(z.string().min(1).max(80)).length(2),
  provider: AIProviderSchema,
  model: AIModelSchema,
});
