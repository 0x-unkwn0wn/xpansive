import { z } from "zod";

export const AIProviderSchema = z.enum(["openai", "anthropic", "gemini", "openrouter", "groq"]);
export const AIModelSchema = z.string().trim().min(1).max(160);
export type AIProviderValue = z.infer<typeof AIProviderSchema>;
