import { z } from "zod";
import { JourneySummarySchema } from "@/lib/schemas/summary";
import { MAX_STEER_LENGTH, MIN_STEER_LENGTH } from "@/lib/constants";
import { AIModelSchema, AIProviderSchema } from "@/lib/schemas/ai";
import { ExplorationSynthesisSchema } from "@/lib/schemas/convergence";

export const ExpansionOptionSchema = z.object({
  title: z.string().trim().min(2).max(90),
  description: z.string().trim().min(5).max(240),
  rationale: z.string().trim().max(240).optional(),
  conceptualType: z.string().trim().max(80).optional(),
});

export const ExpansionResponseSchema = z.object({
  options: z.array(ExpansionOptionSchema).length(3),
});

export const AlternativeExpansionResponseSchema = z.object({
  options: z.array(ExpansionOptionSchema).length(3),
});

export const SuggestionHistoryEntrySchema = z.object({
  id: z.string().min(1).max(80),
  option: ExpansionOptionSchema,
  createdAt: z.string().min(1).max(80),
  source: z.enum(["steer", "discarded"]),
});

export const LanguageSchema = z.enum(["auto", "en", "es"]);
export const SteerSchema = z.string().trim().min(MIN_STEER_LENGTH).max(MAX_STEER_LENGTH).refine((value) => /[\p{L}\p{N}]/u.test(value), "Steer must contain a letter or number").transform((value) => value.replace(/\s+/g, " "));

export const ExpandRequestSchema = z.object({
  initialIdea: z.string().trim().min(1).max(280),
  path: z.array(ExpansionOptionSchema).max(12),
  current: z.string().trim().min(1).max(90).optional(),
  previouslyExplored: z.array(z.string().trim().min(1).max(90)).max(100).optional(),
  currentOptions: z.array(ExpansionOptionSchema).max(100).optional(),
  rejectedOptions: z.array(ExpansionOptionSchema).max(200).optional(),
  generation: z.enum(["initial", "alternative"]).default("initial"),
  steer: SteerSchema.optional(),
  context: z.object({
    rootPrompt: z.string().trim().min(1).max(280),
    goal: z.string().trim().max(500).optional(),
    constraints: z.array(z.string().trim().min(1).max(240)).max(20).default([]),
    summary: z.string().trim().max(2000).optional(),
    path: z.array(z.object({ title: z.string().max(280), description: z.string().max(240), steer: z.string().max(100).optional(), decision: z.string().max(32).optional() })).max(12).default([]),
  }).optional(),
  language: LanguageSchema.default("auto"),
  provider: AIProviderSchema,
  model: AIModelSchema,
});

export const ExplorationNodeSchema = z.object({
  id: z.string().min(1).max(80),
  parentId: z.string().max(80).nullable(),
  parentIds: z.array(z.string().min(1).max(80)).max(3).default([]),
  title: z.string().trim().min(1).max(280),
  description: z.string().max(240).default(""),
  status: z.enum(["explored", "available"]),
  branchStatus: z.enum(["active", "discarded"]).default("active"),
  state: z.enum(["active", "discarded", "favorite", "conclusion", "merged"]).default("active"),
  origin: z.enum(["ai", "manual", "merge"]).default("ai"),
  generationId: z.string().max(120).optional(),
  mergedInto: z.string().min(1).max(120).optional(),
  children: z.array(z.string().min(1).max(80)).max(100),
  activeChildIds: z.array(z.string().min(1).max(80)).max(100).default([]),
  activeSuggestionIds: z.array(z.string().min(1).max(80)).max(100).default([]),
  suggestionHistory: z.array(SuggestionHistoryEntrySchema).max(100).default([]),
  createdAt: z.string().min(1).max(80),
  rejectedOptions: z.array(ExpansionOptionSchema).max(200).default([]),
  alternativeGenerationCount: z.number().int().min(0).default(0),
  alternativeBatches: z.array(z.array(ExpansionOptionSchema).min(1).max(3)).max(100).default([]),
  expansionCache: z.record(z.string(), z.array(ExpansionOptionSchema).length(3)).default({}),
  error: z.string().max(300).optional(),
});

export const ExplorationStateSchema = z.object({
  id: z.string().min(1).max(80),
  initialIdea: z.string().trim().min(1).max(280),
  language: LanguageSchema.default("auto"),
  rootNodeId: z.string().min(1).max(80),
  nodes: z.record(ExplorationNodeSchema).refine((nodes) => Object.keys(nodes).length <= 100, "Exploration is too large"),
  generations: z.record(z.object({ id: z.string().max(120), nodeId: z.string().max(80), steer: z.string().max(100).optional(), createdAt: z.string().max(80) })).default({}),
  activeNodeId: z.string().min(1).max(80),
  goal: z.string().trim().max(500).optional(),
  constraints: z.array(z.string().trim().min(1).max(240)).max(20).default([]),
  summary: z.string().max(2000).optional(),
  conclusionNodeId: z.string().max(80).optional(),
  resolutionStatus: z.enum(["active", "resolved"]).default("active"),
  resolvedAt: z.string().max(80).optional(),
  synthesis: ExplorationSynthesisSchema.optional(),
  synthesisStale: z.boolean().optional(),
  journeySummary: JourneySummarySchema.optional(),
  journeySummaryPathKey: z.string().max(2000).optional(),
  steer: z.string().max(100).optional(),
  shareId: z.string().min(8).max(64).optional(),
  isShared: z.boolean().optional(),
  remoteRevision: z.number().int().min(0).optional(),
}).superRefine((value, ctx) => {
  if (!value.nodes[value.rootNodeId]) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Root node is required", path: ["rootNodeId"] });
  if (!value.nodes[value.activeNodeId]) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Active node does not exist", path: ["activeNodeId"] });
});

export const LegacyExplorationNodeSchema = z.object({
  id: z.string().min(1).max(80),
  parentId: z.string().max(80).nullable(),
  option: ExpansionOptionSchema.nullable(),
  options: z.array(ExpansionOptionSchema).length(3).nullable(),
  rejectedOptions: z.array(ExpansionOptionSchema).max(100).default([]),
  alternativeGenerationCount: z.number().int().min(0).default(0),
  alternativeBatches: z.array(z.array(ExpansionOptionSchema).min(1).max(3)).max(100).default([]),
  expansionCache: z.record(z.string(), z.array(ExpansionOptionSchema).length(3)).default({}),
  error: z.string().max(300).optional(),
});

export const LegacyExplorationStateSchema = z.object({
  initialIdea: z.string().trim().min(1).max(280),
  language: LanguageSchema.default("auto"),
  nodes: z.record(LegacyExplorationNodeSchema).refine((nodes) => Object.keys(nodes).length <= 100, "Exploration is too large"),
  activeNodeId: z.string().min(1).max(80),
  goal: z.string().trim().max(500).optional(),
  constraints: z.array(z.string().trim().min(1).max(240)).max(20).default([]),
  journeySummary: JourneySummarySchema.optional(),
  journeySummaryPathKey: z.string().max(2000).optional(),
});

export type ExpansionOption = z.infer<typeof ExpansionOptionSchema>;
