import type { AIProviderName, ProviderModel } from "@/lib/types";

export type AIProviderDescriptor = {
  id: AIProviderName;
  name: string;
  description: string;
  dashboardUrl: string;
  apiKeyInstructions: { en: string; es: string };
  defaultModel: string;
  models: ProviderModel[];
};

export const AI_PROVIDER_CATALOG: AIProviderDescriptor[] = [
  { id: "openai", name: "OpenAI", description: "Use models from the OpenAI API.", dashboardUrl: "https://platform.openai.com/api-keys", apiKeyInstructions: { en: "Open API keys, create a new secret key, and copy it.", es: "Abre API keys, crea una nueva secret key y cópiala." }, defaultModel: "gpt-4o-mini", models: [{ id: "gpt-4o-mini", label: "GPT-4o mini" }] },
  { id: "anthropic", name: "Anthropic", description: "Use Claude models through the Anthropic API.", dashboardUrl: "https://console.anthropic.com/settings/keys", apiKeyInstructions: { en: "Open the Anthropic Console, create an API key, and copy it.", es: "Abre la consola de Anthropic, crea una API key y cópiala." }, defaultModel: "claude-haiku-4-5-20251001", models: [{ id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" }] },
  { id: "gemini", name: "Google Gemini", description: "Use Gemini models from Google AI Studio.", dashboardUrl: "https://aistudio.google.com/app/apikey", apiKeyInstructions: { en: "Open Google AI Studio, create an API key, and copy it.", es: "Abre Google AI Studio, genera una API key y cópiala." }, defaultModel: "gemini-2.5-flash", models: [{ id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" }] },
  { id: "openrouter", name: "OpenRouter", description: "Access multiple models through one API.", dashboardUrl: "https://openrouter.ai/settings/keys", apiKeyInstructions: { en: "Open Keys, create an API key, and copy it.", es: "Abre Keys, crea una API key y cópiala." }, defaultModel: "openai/gpt-4o-mini", models: [{ id: "openai/gpt-4o-mini", label: "OpenAI GPT-4o mini" }] },
  { id: "groq", name: "Groq", description: "Run supported open models through Groq.", dashboardUrl: "https://console.groq.com/keys", apiKeyInstructions: { en: "Open API Keys, create a key, and copy it.", es: "Abre API Keys, crea una key y cópiala." }, defaultModel: "llama-3.3-70b-versatile", models: [{ id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" }] },
];

export function getProviderDescriptor(id: AIProviderName) {
  return AI_PROVIDER_CATALOG.find((provider) => provider.id === id) ?? AI_PROVIDER_CATALOG[0];
}
