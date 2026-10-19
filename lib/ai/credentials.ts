import type { ConnectedAIProvider } from "@/lib/types";

export const BYOK_REQUIRED_CODE = "BYOK_REQUIRED";

export function hasConfiguredApiKey(credentials: Pick<ConnectedAIProvider, "apiKey"> | null | undefined): credentials is ConnectedAIProvider {
  return Boolean(credentials?.apiKey.trim());
}

export function isByokRequiredError(error: unknown) {
  return error instanceof Error && "code" in error && (error as { code?: unknown }).code === BYOK_REQUIRED_CODE;
}

export function hasBasicApiKeyFormat(value: string) {
  return value.trim().length >= 8 && /[A-Za-z0-9]/.test(value);
}
