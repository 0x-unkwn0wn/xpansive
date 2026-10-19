import { z } from "zod";
import { AIModelSchema, AIProviderSchema } from "@/lib/schemas/ai";

const SummaryExpansionOptionSchema = z.object({
  title: z.string().trim().min(2).max(90),
  description: z.string().trim().min(5).max(240),
});

const SummaryLanguageSchema = z.enum(["auto", "en", "es"]);

export const JourneySummarySchema = z.object({
  summary: z.string().trim().min(20).max(1800),
  keyInsights: z.array(z.string().trim().min(8).max(240)).length(3),
});

export const SummarizeRequestSchema = z.object({
  initialIdea: z.string().trim().min(1).max(280),
  path: z.array(SummaryExpansionOptionSchema).min(3).max(12),
  language: SummaryLanguageSchema.default("auto"),
  provider: AIProviderSchema,
  model: AIModelSchema,
});

export type JourneySummaryResponse = z.infer<typeof JourneySummarySchema>;
