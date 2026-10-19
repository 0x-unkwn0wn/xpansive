import assert from "node:assert/strict";
import { expandIdea } from "@/lib/ai/expand";
import type { AIProvider, GenerateArgs } from "@/lib/ai/provider";

function fakeProvider(calls: { count: number }): AIProvider {
  return {
    name: "openai",
    model: "test-model",
    async validate() {},
    async generate<T>(args: GenerateArgs<T>) {
      calls.count += 1;
      const value = { options: [{ title: "One concrete territory", description: "A distinct territory to explore." }, { title: "Another concrete territory", description: "A second distinct territory to explore." }, { title: "A third concrete territory", description: "A third distinct territory to explore." }] };
      const result = args.parse(value);
      args.onUsage?.({ inputTokens: 10, outputTokens: 20 });
      return result;
    },
  };
}

const calls = { count: 0 };
const provider = fakeProvider(calls);

async function main() {
  await expandIdea("Transportation", [], [], "en", [], provider);
  assert.equal(calls.count, 1, "A node without generated content calls the provider once");

  const byokCalls = { count: 0 };
  const byok = fakeProvider(byokCalls);
  await byok.generate({ system: "system", user: "user", maxOutputTokens: 20, timeoutMs: 1000, parse: (value) => value as { ok: true } });
  assert.equal(byokCalls.count, 1, "BYOK still executes the provider");

  console.log("AI provider and BYOK tests passed.");
}

void main();
