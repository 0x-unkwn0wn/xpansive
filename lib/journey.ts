import type { ExpansionOption, LanguagePreference } from "@/lib/types";
import { normalizeSteer } from "@/lib/steer";

export function journeyCacheKey(initialIdea: string, path: ExpansionOption[], language: LanguagePreference) {
  return JSON.stringify({
    initialIdea: initialIdea.trim(),
    language,
    path: path.map(({ title, description }) => ({ title, description })),
  });
}

export function expansionCacheKey(initialIdea: string, path: ExpansionOption[], rejectedOptions: ExpansionOption[], language: LanguagePreference, steer?: string) {
  return JSON.stringify({
    initialIdea: initialIdea.trim(),
    language,
    path: path.map(({ title, description }) => ({ title, description })),
    rejectedOptions: rejectedOptions.map(({ title, description }) => ({ title, description })),
    steer: steer ? normalizeSteer(steer).toLocaleLowerCase() : "",
  });
}
