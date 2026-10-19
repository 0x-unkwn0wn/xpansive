import { AI_PROVIDER_CATALOG, getProviderDescriptor } from "@/lib/ai/catalog";
import type { AIProviderName, ProviderModel } from "@/lib/types";
import type { AIProvider, GenerateArgs, AIErrorCode } from "@/lib/ai/types";

export class ProviderError extends Error {
  constructor(message: string, public readonly retryable = false, public readonly statusCode?: number, public readonly code: AIErrorCode = "UNKNOWN") {
    super(message);
    this.name = "ProviderError";
  }
}

function errorCode(status: number): AIErrorCode {
  if (status === 401 || status === 403) return "INVALID_API_KEY";
  if (status === 402) return "INSUFFICIENT_CREDITS";
  if (status === 404) return "MODEL_NOT_AVAILABLE";
  if (status === 429) return "RATE_LIMIT";
  if (status >= 500) return "PROVIDER_UNAVAILABLE";
  return "UNKNOWN";
}

async function readProviderResponse(response: Response, provider: string) {
  if (response.ok) return response.json() as Promise<Record<string, unknown>>;
  const code = errorCode(response.status);
  throw new ProviderError(`${provider} request failed.`, code === "RATE_LIMIT" || code === "PROVIDER_UNAVAILABLE", response.status, code);
}

function textContent(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textContent).filter(Boolean).join("\n");
  if (!value || typeof value !== "object") return "";
  const candidate = value as { text?: unknown; content?: unknown; parts?: unknown };
  if (candidate.text !== undefined) return textContent(candidate.text);
  if (candidate.content !== undefined) return textContent(candidate.content);
  if (candidate.parts !== undefined) return textContent(candidate.parts);
  return "";
}

function parseContent(value: unknown, parse: (value: unknown) => unknown) {
  const content = textContent(value);
  if (!content.trim()) throw new ProviderError("The provider returned an empty response.", true, undefined, "INVALID_OUTPUT");
  try {
    const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    const json = start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
    return parse(JSON.parse(json));
  } catch (error) {
    console.error("xpansive.ai.invalid_output", {
      reason: error instanceof Error ? error.message : "Unknown structured-output parsing error",
      preview: content.slice(0, 500),
    });
    throw new ProviderError("The provider returned invalid structured output.", true, undefined, "INVALID_OUTPUT");
  }
}

function withTimeout(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, clear: () => clearTimeout(timer) };
}

abstract class BaseProvider implements AIProvider {
  abstract readonly id: AIProviderName;
  abstract readonly name: string;
  constructor(readonly model: string, protected readonly apiKey: string) {}
  abstract generate<T>(args: GenerateArgs<T>): Promise<T>;
  abstract validate(): Promise<void>;
  abstract listModels(): Promise<ProviderModel[]>;
}

class OpenAICompatibleProvider extends BaseProvider {
  constructor(readonly id: "openai" | "openrouter" | "groq", name: string, private readonly baseUrl: string, model: string, apiKey: string, private readonly extraHeaders: Record<string, string> = {}) {
    super(model, apiKey);
    this.name = name;
  }
  readonly name: string;

  private headers() { return { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}`, ...this.extraHeaders }; }

  async generate<T>({ system, user, maxOutputTokens, parse, timeoutMs, onUsage }: GenerateArgs<T>) {
    const timeout = withTimeout(timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, { method: "POST", headers: this.headers(), body: JSON.stringify({ model: this.model, temperature: 0.8, max_tokens: maxOutputTokens, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }), signal: timeout.controller.signal });
      const payload = await readProviderResponse(response, this.name) as { choices?: Array<{ message?: { content?: unknown } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } };
      const result = parseContent(payload.choices?.[0]?.message?.content, parse);
      onUsage?.({ inputTokens: payload.usage?.prompt_tokens ?? 0, outputTokens: payload.usage?.completion_tokens ?? 0 });
      return result as T;
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (error instanceof Error && error.name === "AbortError") throw new ProviderError("The provider request timed out.", true, undefined, "TIMEOUT");
      throw new ProviderError("The provider is unavailable.", true, undefined, "PROVIDER_UNAVAILABLE");
    } finally { timeout.clear(); }
  }

  async listModels() {
    const response = await fetch(`${this.baseUrl}/models`, { headers: this.headers() });
    const payload = await readProviderResponse(response, this.name) as { data?: Array<{ id?: string; name?: string }> };
    return (payload.data ?? []).filter((model): model is { id: string; name?: string } => Boolean(model.id)).slice(0, 100).map((model) => ({ id: model.id, label: model.name ?? model.id }));
  }

  async validate() { await this.listModels(); }
}

class AnthropicProvider extends BaseProvider {
  readonly id = "anthropic" as const;
  readonly name = "Anthropic";
  private headers() { return { "Content-Type": "application/json", "x-api-key": this.apiKey, "anthropic-version": "2023-06-01" }; }

  async generate<T>({ system, user, maxOutputTokens, parse, timeoutMs, onUsage }: GenerateArgs<T>) {
    const timeout = withTimeout(timeoutMs);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: this.headers(), body: JSON.stringify({ model: this.model, max_tokens: maxOutputTokens, system, messages: [{ role: "user", content: user }] }), signal: timeout.controller.signal });
      const payload = await readProviderResponse(response, this.name) as { content?: unknown; usage?: { input_tokens?: number; output_tokens?: number } };
      const result = parseContent(payload.content, parse);
      onUsage?.({ inputTokens: payload.usage?.input_tokens ?? 0, outputTokens: payload.usage?.output_tokens ?? 0 });
      return result as T;
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (error instanceof Error && error.name === "AbortError") throw new ProviderError("The provider request timed out.", true, undefined, "TIMEOUT");
      throw new ProviderError("The provider is unavailable.", true, undefined, "PROVIDER_UNAVAILABLE");
    } finally { timeout.clear(); }
  }

  async listModels() { return getProviderDescriptor(this.id).models; }

  async validate() {
    const timeout = withTimeout(8_000);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: this.headers(), body: JSON.stringify({ model: this.model, max_tokens: 1, messages: [{ role: "user", content: "Reply with OK." }] }), signal: timeout.controller.signal });
      await readProviderResponse(response, this.name);
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (error instanceof Error && error.name === "AbortError") throw new ProviderError("The provider request timed out.", true, undefined, "TIMEOUT");
      throw new ProviderError("The provider is unavailable.", true, undefined, "PROVIDER_UNAVAILABLE");
    } finally { timeout.clear(); }
  }
}

class GeminiProvider extends BaseProvider {
  readonly id = "gemini" as const;
  readonly name = "Google Gemini";
  private headers() { return { "Content-Type": "application/json", "x-goog-api-key": this.apiKey }; }

  async generate<T>({ system, user, maxOutputTokens, parse, timeoutMs, onUsage }: GenerateArgs<T>) {
    const timeout = withTimeout(timeoutMs);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`, { method: "POST", headers: this.headers(), body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: user }] }], generationConfig: { temperature: 0.8, maxOutputTokens, responseMimeType: "application/json" } }), signal: timeout.controller.signal });
      const payload = await readProviderResponse(response, this.name) as { candidates?: Array<{ content?: unknown }>; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } };
      const result = parseContent(payload.candidates?.[0]?.content, parse);
      onUsage?.({ inputTokens: payload.usageMetadata?.promptTokenCount ?? 0, outputTokens: payload.usageMetadata?.candidatesTokenCount ?? 0 });
      return result as T;
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (error instanceof Error && error.name === "AbortError") throw new ProviderError("The provider request timed out.", true, undefined, "TIMEOUT");
      throw new ProviderError("The provider is unavailable.", true, undefined, "PROVIDER_UNAVAILABLE");
    } finally { timeout.clear(); }
  }

  async listModels() {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", { headers: this.headers() });
    const payload = await readProviderResponse(response, this.name) as { models?: Array<{ name?: string; displayName?: string; supportedGenerationMethods?: string[] }> };
    return (payload.models ?? []).filter((model) => model.name && (!model.supportedGenerationMethods || model.supportedGenerationMethods.includes("generateContent"))).slice(0, 100).map((model) => ({ id: model.name!.replace(/^models\//, ""), label: model.displayName ?? model.name! }));
  }

  async validate() { await this.listModels(); }
}

export function createAIProvider(provider: AIProviderName, apiKey: string, model: string): AIProvider {
  const key = apiKey.trim();
  if (!key) throw new ProviderError("An API key is required.", false, 401, "INVALID_API_KEY");
  if (provider === "openai") return new OpenAICompatibleProvider("openai", "OpenAI", "https://api.openai.com/v1", model, key);
  if (provider === "openrouter") return new OpenAICompatibleProvider("openrouter", "OpenRouter", "https://openrouter.ai/api/v1", model, key, { "HTTP-Referer": "https://xpansive.org", "X-Title": "Xpansive" });
  if (provider === "groq") return new OpenAICompatibleProvider("groq", "Groq", "https://api.groq.com/openai/v1", model, key);
  if (provider === "anthropic") return new AnthropicProvider(model, key);
  return new GeminiProvider(model, key);
}

export function providerCatalog() { return AI_PROVIDER_CATALOG; }

export type { AIProvider, GenerateArgs, ProviderUsage } from "@/lib/ai/types";
