import type { AIProviderName, ProviderModel } from "@/lib/types";

export type ProviderUsage = { inputTokens: number; outputTokens: number };

export type GenerateArgs<T> = {
  system: string;
  user: string;
  maxOutputTokens: number;
  parse: (value: unknown) => T;
  timeoutMs: number;
  onUsage?: (usage: ProviderUsage) => void;
};

export type AIErrorCode = "INVALID_API_KEY" | "RATE_LIMIT" | "INSUFFICIENT_CREDITS" | "MODEL_NOT_AVAILABLE" | "PROVIDER_UNAVAILABLE" | "INVALID_OUTPUT" | "TIMEOUT" | "UNKNOWN";

export interface AIProvider {
  readonly id?: AIProviderName;
  readonly name: string;
  readonly model: string;
  generate<T>(args: GenerateArgs<T>): Promise<T>;
  validate(): Promise<void>;
  listModels?: () => Promise<ProviderModel[]>;
}
