import { z } from "zod";
import { ExplorationNodeSchema, ExplorationStateSchema, LanguageSchema } from "@/lib/schemas/expansion";
import { JourneySummarySchema } from "@/lib/schemas/summary";

export const CreateExplorationSchema = z.object({
  initialIdea: z.string().trim().min(1).max(280),
  language: LanguageSchema.default("auto"),
  goal: z.string().trim().max(500).optional(),
  constraints: z.array(z.string().trim().min(1).max(240)).max(20).default([]),
  state: ExplorationStateSchema.optional(),
});

export const PersistedNodeSchema = ExplorationNodeSchema.omit({ children: true, expansionCache: true }).extend({
  parentIds: z.array(z.string().min(1).max(80)).max(3).default([]),
  activeChildIds: z.array(z.string().min(1).max(80)).max(100).default([]),
});

export const PersistedGenerationSchema = z.object({
  id: z.string().min(1).max(120),
  nodeId: z.string().min(1).max(80),
  steer: z.string().max(100).optional(),
  createdAt: z.string().min(1).max(80),
});

export const PersistExplorationSchema = z.object({
  revision: z.number().int().min(0),
  currentNodeId: z.string().min(1).max(80),
  nodes: z.array(PersistedNodeSchema).max(100),
  generations: z.array(PersistedGenerationSchema).max(100).optional(),
  goal: z.string().trim().max(500).optional().nullable(),
  constraints: z.array(z.string().trim().min(1).max(240)).max(20).optional(),
  summary: z.string().max(2000).optional().nullable(),
  conclusionNodeId: z.string().max(80).optional().nullable(),
  resolutionStatus: z.enum(["active", "resolved"]).optional(),
  resolvedAt: z.string().max(80).optional().nullable(),
  synthesis: z.unknown().optional().nullable(),
  synthesisStale: z.boolean().optional(),
  journeySummary: JourneySummarySchema.optional().nullable(),
  journeySummaryPathKey: z.string().max(2000).optional().nullable(),
  steer: z.string().max(100).optional().nullable(),
});

export type PersistedNode = z.infer<typeof PersistedNodeSchema>;
