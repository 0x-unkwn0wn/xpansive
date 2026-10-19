const FALLBACK_PATH = "/app";

/**
 * Only allow internal absolute paths to be carried through the magic-link
 * flow. This prevents turning the login redirect into an open redirect.
 */
export function safeNextPath(value: unknown, fallback = FALLBACK_PATH) {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try {
    const parsed = new URL(value, "https://xpansive.invalid");
    if (parsed.origin !== "https://xpansive.invalid") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallback;
  } catch {
    return fallback;
  }
}
