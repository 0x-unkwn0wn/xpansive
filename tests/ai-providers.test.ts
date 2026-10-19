import assert from "node:assert/strict";
import { createAIProvider } from "@/lib/ai/gateway";
import type { AIProviderName } from "@/lib/types";

const providers: AIProviderName[] = ["openai", "anthropic", "gemini", "openrouter", "groq"];
const originalFetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
  const url = String(input);
  const body = init?.body ? JSON.parse(String(init.body)) as { model?: string } : {};

  if (url.endsWith("/models")) {
    if (url.includes("generativelanguage")) {
      return new Response(JSON.stringify({ models: [{ name: "models/gemini-2.5-flash", displayName: "Gemini", supportedGenerationMethods: ["generateContent"] }] }), { status: 200 });
    }
    return new Response(JSON.stringify({ data: [{ id: body.model ?? "test-model", name: "Test model" }] }), { status: 200 });
  }
  if (url.includes("anthropic.com")) return new Response(JSON.stringify({ content: [{ type: "text", text: "{\"ok\":true}" }] }), { status: 200 });
  if (url.includes("generativelanguage.googleapis.com")) return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{\"ok\":true}" }] } }] }), { status: 200 });
  return new Response(JSON.stringify({ choices: [{ message: { content: "{\"ok\":true}" } }] }), { status: 200 });
};

async function main() {
  try {
    await Promise.all(providers.map(async (name) => {
      const provider = createAIProvider(name, `${name}-test-key`, name === "gemini" ? "gemini-2.5-flash" : "test-model");
      await provider.validate();
      const result = await provider.generate({ system: "system", user: "user", maxOutputTokens: 10, timeoutMs: 1000, parse: (value) => value as { ok: boolean } });
      assert.equal(result.ok, true, `${name} should parse structured output`);
    }));
    console.log("Concurrent AI provider adapter tests passed.");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

void main();
