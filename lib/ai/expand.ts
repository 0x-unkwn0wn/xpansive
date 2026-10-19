import { ALTERNATIVE_EXPANSION_SYSTEM_PROMPT, buildAlternativePrompt, buildExpansionPrompt, EXPANSION_SYSTEM_PROMPT, type ExpansionCorrection } from "@/lib/ai/prompts";
import { parseAlternativeExpansionResponse, parseExpansionResponse, ProviderError, type AIProvider } from "@/lib/ai/provider";
import { EXPANSION_MAX_OUTPUT_TOKENS, EXPANSION_TIMEOUT_MS } from "@/lib/constants";
import type { ExpansionOption, LanguagePreference } from "@/lib/types";
import type { ExplorationContext } from "@/lib/ai/context";

const ABSTRACT_BRAINSTORMING_PATTERNS = [
  /change the perspective|cambia la perspectiva/i,
  /reframe the problem|replantea el problema/i,
  /challenge assumptions|desaf[ií]a las suposiciones/i,
  /change the scale|cambia la escala/i,
  /remove constraints|elimina las restricciones/i,
  /connect .* field|conecta .* campo/i,
  /think long.?term|piensa a largo plazo/i,
  /hidden conditions|condiciones ocultas/i,
  /invert the question|invierte la pregunta/i,
  /change the surrounding system|cambia el sistema que lo rodea/i,
  /redesign the hidden conditions|redise[nñ]a las condiciones ocultas/i,
  /invert the default assumption|invierte la suposici[oó]n principal/i,
  /remove the central dependency|elimina la dependencia central/i,
  /borrow a lens|toma prestada una mirada/i,
  /shift the scale|cambia la escala de la pregunta/i,
];

const STOP_WORDS = new Set(["a", "an", "and", "the", "to", "of", "for", "in", "on", "la", "el", "los", "las", "y", "de", "para", "en", "del", "un", "una"]);
const SYNONYM_CANONICAL = new Map([
  ["ai", "ai"], ["artificial", "ai"], ["intelligence", "ai"],
  ["increase", "advance"], ["increases", "advance"], ["increasing", "advance"], ["augment", "advance"], ["augmented", "advance"], ["extend", "advance"], ["extends", "advance"], ["improve", "advance"], ["improving", "advance"], ["enhance", "advance"], ["enhancing", "advance"],
  ["capability", "capability"], ["capabilities", "capability"], ["ability", "capability"], ["abilities", "capability"],
  ["human", "human"], ["humans", "human"], ["people", "human"], ["person", "human"],
  ["transport", "transport"], ["transportation", "transport"], ["mobility", "transport"], ["transit", "transport"],
  ["education", "education"], ["learning", "education"], ["schooling", "education"],
  ["energy", "energy"], ["power", "energy"], ["electricity", "energy"],
  ["restaurant", "restaurant"], ["restaurants", "restaurant"], ["dining", "restaurant"],
  ["sleep", "sleep"], ["rest", "sleep"], ["sleeping", "sleep"],
]);

export type ExpansionValidation =
  | { ok: true; result: ReturnType<typeof parseExpansionResponse> }
  | { ok: false; rejectedOptions: ExpansionOption[]; reasons: string[] };

export type AlternativeExpansionValidation =
  | { ok: true; result: ReturnType<typeof parseAlternativeExpansionResponse> }
  | { ok: false; rejectedOptions: ExpansionOption[]; reasons: string[] };

export function normalizeTitle(value: string) {
  const plain = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/\bartificial intelligence\b/g, "ai");
  const tokens = plain.replace(/[^a-z0-9áéíóúüñ]+/gi, " ").trim().split(/\s+/).filter(Boolean);
  const filtered = tokens.filter((token) => !STOP_WORDS.has(token));
  return (filtered.length ? filtered : tokens).map((token) => SYNONYM_CANONICAL.get(token) ?? token).join(" ");
}

function titlesAreEquivalent(left: string, right: string) {
  const leftNormalized = normalizeTitle(left);
  const rightNormalized = normalizeTitle(right);
  if (!leftNormalized || !rightNormalized) return true;
  if (leftNormalized === rightNormalized) return true;
  const leftTokens = new Set(leftNormalized.split(" "));
  const rightTokens = new Set(rightNormalized.split(" "));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union > 1 && intersection / union >= 0.75;
}

const DIRECTION_PATTERNS: Array<[string, RegExp]> = [
  ["question", /assumption|risk|contradiction|tension|failure|problem|danger|ethic|suposici[oó]n|riesgo|contradicci[oó]n|tensi[oó]n|fallo|problema|peligro|[eé]tica/i],
  ["perspective", /user|people|actor|stakeholder|community|institution|worker|customer|usuario|persona|actor|comunidad|instituci[oó]n|trabajador|cliente/i],
  ["concrete", /application|product|action|experiment|prototype|onboarding|implement|aplicaci[oó]n|producto|acci[oó]n|experimento|prototipo|incorporaci[oó]n|implementar/i],
  ["consequence", /consequence|effect|impact|side effect|future|obsolete|consecuencia|efecto|impacto|efecto secundario|futuro|obsoleto/i],
  ["alternative", /alternative|another way|substitute|different approach|alternativa|otra forma|sustituto|enfoque distinto/i],
  ["combination", /combine|connect|bridge|hybrid|relate|combinar|conectar|puente|h[ií]brido|relacionar/i],
  ["extreme", /radical|extreme|limit|without|maximum|minimum|radical|extremo|l[ií]mite|sin |m[aá]ximo|m[ií]nimo/i],
  ["mechanism", /how it works|mechanism|infrastructure|process|underlying|c[oó]mo funciona|mecanismo|infraestructura|proceso|base/i],
];

function meaningfulTokens(option: ExpansionOption) {
  return new Set(normalizeTitle(`${option.title} ${option.description}`).split(" ").filter((token) => token.length > 2));
}

function directionSignatures(option: ExpansionOption) {
  const text = `${option.title} ${option.description}`;
  return new Set(DIRECTION_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([name]) => name));
}

export function expansionSimilarity(left: ExpansionOption, right: ExpansionOption) {
  const leftTokens = meaningfulTokens(left);
  const rightTokens = meaningfulTokens(right);
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union ? intersection / union : 1;
}

export function expansionsAreTooSimilar(left: ExpansionOption, right: ExpansionOption) {
  if (titlesAreEquivalent(left.title, right.title)) return true;
  const similarity = expansionSimilarity(left, right);
  const sharedDirections = [...directionSignatures(left)].some((direction) => directionSignatures(right).has(direction));
  return similarity >= 0.7 || (sharedDirections && similarity >= 0.4);
}

export function validateExpansion(result: ReturnType<typeof parseExpansionResponse>, initialIdea: string, path: ExpansionOption[] = [], previouslyExplored: string[] = [], rejectedOptions: ExpansionOption[] = []): ExpansionValidation {
  const rejectedIndexes = new Set<number>();
  const reasons: string[] = [];
  const forbidden = [
    { label: "the original idea", option: { title: initialIdea, description: "" }, semantic: false },
    ...path.map((option, index) => ({ label: `ancestor ${index + 1}`, option, semantic: false })),
    ...previouslyExplored.map((title) => ({ label: "previously explored territory", option: { title, description: "" }, semantic: false })),
    ...rejectedOptions.map((option) => ({ label: "a rejected direction", option, semantic: true })),
  ];

  const reject = (index: number, reason: string) => {
    rejectedIndexes.add(index);
    reasons.push(`Option ${index + 1}: ${reason}`);
  };

  result.options.forEach((option, index) => {
    const normalized = normalizeTitle(option.title);
    if (!normalized) reject(index, "empty or unusable title");
    if (ABSTRACT_BRAINSTORMING_PATTERNS.some((pattern) => pattern.test(`${option.title} ${option.description}`))) reject(index, "generic brainstorming technique");
    const forbiddenMatch = forbidden.find((item) => titlesAreEquivalent(option.title, item.option.title) || (item.semantic && expansionsAreTooSimilar(option, item.option)));
    if (forbiddenMatch) reject(index, `repeats ${forbiddenMatch.label}: ${forbiddenMatch.option.title}`);
  });

  for (let index = 0; index < result.options.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < result.options.length; otherIndex += 1) {
      if (expansionsAreTooSimilar(result.options[index], result.options[otherIndex])) {
        reject(otherIndex, `is too similar to option ${index + 1}; replace it with a different direction`);
      }
    }
  }

  if (rejectedIndexes.size === 0) return { ok: true, result };
  return {
    ok: false,
    rejectedOptions: [...rejectedIndexes].map((index) => result.options[index]),
    reasons: [...new Set(reasons)],
  };
}

export function validateAlternative(result: ReturnType<typeof parseAlternativeExpansionResponse>, initialIdea: string, path: ExpansionOption[] = [], previouslyExplored: string[] = [], currentOptions: ExpansionOption[] = [], rejectedOptions: ExpansionOption[] = []): AlternativeExpansionValidation {
  const forbidden = [{ label: "the original idea", option: { title: initialIdea, description: "" } }, ...path.map((item, index) => ({ label: `ancestor ${index + 1}`, option: item })), ...previouslyExplored.map((title) => ({ label: "previously explored territory", option: { title, description: "" } })), ...currentOptions.map((item) => ({ label: "an active direction", option: item })), ...rejectedOptions.map((item) => ({ label: "a rejected direction", option: item }))];
  const rejectedIndexes = new Set<number>();
  const reasons: string[] = [];
  result.options.forEach((option, index) => {
    if (ABSTRACT_BRAINSTORMING_PATTERNS.some((pattern) => pattern.test(`${option.title} ${option.description}`))) {
      rejectedIndexes.add(index);
      reasons.push(`Option ${index + 1}: generic brainstorming technique`);
      return;
    }
    const forbiddenMatch = forbidden.find((item) => titlesAreEquivalent(option.title, item.option.title) || expansionsAreTooSimilar(option, item.option));
    if (forbiddenMatch) {
      rejectedIndexes.add(index);
      reasons.push(`Option ${index + 1}: repeats ${forbiddenMatch.label}: ${forbiddenMatch.option.title}`);
    }
  });
  for (let index = 0; index < result.options.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < result.options.length; otherIndex += 1) {
      if (expansionsAreTooSimilar(result.options[index], result.options[otherIndex])) {
        rejectedIndexes.add(otherIndex);
        reasons.push(`Option ${otherIndex + 1}: too similar to option ${index + 1}`);
      }
    }
  }
  if (!rejectedIndexes.size) return { ok: true, result };
  return { ok: false, rejectedOptions: [...rejectedIndexes].map((index) => result.options[index]), reasons: [...new Set(reasons)] };
}

async function requestExpansion(provider: AIProvider, initialIdea: string, path: ExpansionOption[], previouslyExplored: string[], language: LanguagePreference, correction?: ExpansionCorrection, rejectedOptions: ExpansionOption[] = [], steer?: string, context?: ExplorationContext) {
  return provider.generate({
    system: EXPANSION_SYSTEM_PROMPT,
    user: buildExpansionPrompt(initialIdea, path, previouslyExplored, language, correction, rejectedOptions, steer, context),
    maxOutputTokens: EXPANSION_MAX_OUTPUT_TOKENS,
    timeoutMs: EXPANSION_TIMEOUT_MS,
    parse: parseExpansionResponse,
  });
}

async function requestAlternative(provider: AIProvider, initialIdea: string, path: ExpansionOption[], previouslyExplored: string[], language: LanguagePreference, currentOptions: ExpansionOption[], rejectedOptions: ExpansionOption[] = [], steer?: string, context?: ExplorationContext) {
  return provider.generate({
    system: ALTERNATIVE_EXPANSION_SYSTEM_PROMPT,
    user: buildAlternativePrompt(initialIdea, path, previouslyExplored, language, currentOptions, rejectedOptions, steer, context),
    maxOutputTokens: EXPANSION_MAX_OUTPUT_TOKENS,
    timeoutMs: EXPANSION_TIMEOUT_MS,
    parse: parseAlternativeExpansionResponse,
  });
}

export async function retryExpansion(provider: AIProvider, initialIdea: string, path: ExpansionOption[], previouslyExplored: string[], language: LanguagePreference, rejectedOptions: ExpansionOption[], reasons: string[], steer?: string, context?: ExplorationContext) {
  const correction: ExpansionCorrection = { rejectedOptions, reasons };
  let result: ReturnType<typeof parseExpansionResponse>;
  try {
    result = await requestExpansion(provider, initialIdea, path, previouslyExplored, language, correction, rejectedOptions, steer, context);
  } catch (error) {
    throw error instanceof Error ? error : new ProviderError("Corrective expansion failed");
  }
  const validation = validateExpansion(result, initialIdea, path, previouslyExplored, rejectedOptions);
  if (!validation.ok) throw new ProviderError(`Corrective expansion was invalid: ${validation.reasons.join("; ")}`);
  return validation.result;
}

export async function expandIdea(initialIdea: string, path: ExpansionOption[], previouslyExplored: string[] = [], language: LanguagePreference = "auto", rejectedOptions: ExpansionOption[] = [], provider: AIProvider, steer?: string, context?: ExplorationContext) {
  let firstResult: ReturnType<typeof parseExpansionResponse>;
  try {
    firstResult = await requestExpansion(provider, initialIdea, path, previouslyExplored, language, undefined, rejectedOptions, steer, context);
  } catch (error) {
    if (error instanceof ProviderError && !error.retryable) throw error;
    const reason = error instanceof Error ? error.message : "The first response was not valid structured output";
    return retryExpansion(provider, initialIdea, path, previouslyExplored, language, rejectedOptions, [reason], steer, context);
  }
  const validation = validateExpansion(firstResult, initialIdea, path, previouslyExplored, rejectedOptions);
  if (validation.ok) return validation.result;
  try {
    return await retryExpansion(provider, initialIdea, path, previouslyExplored, language, [...rejectedOptions, ...validation.rejectedOptions], validation.reasons, steer, context);
  } catch (error) {
    throw error;
  }
}

export async function expandAlternative(initialIdea: string, path: ExpansionOption[], previouslyExplored: string[] = [], language: LanguagePreference = "auto", currentOptions: ExpansionOption[] = [], rejectedOptions: ExpansionOption[] = [], provider: AIProvider, steer?: string, context?: ExplorationContext) {
  let result: ReturnType<typeof parseAlternativeExpansionResponse>;
  try {
    result = await requestAlternative(provider, initialIdea, path, previouslyExplored, language, currentOptions, rejectedOptions, steer, context);
  } catch (error) {
    try {
      result = await requestAlternative(provider, initialIdea, path, previouslyExplored, language, currentOptions, rejectedOptions, steer, context);
    } catch (retryError) {
      throw retryError instanceof Error ? retryError : error instanceof Error ? error : new ProviderError("Alternative expansion failed");
    }
  }
  const validation = validateAlternative(result, initialIdea, path, previouslyExplored, currentOptions, rejectedOptions);
  if (validation.ok) return validation.result;
  try {
    result = await requestAlternative(provider, initialIdea, path, previouslyExplored, language, currentOptions, [...rejectedOptions, ...validation.rejectedOptions], steer, context);
  } catch (error) {
    throw error instanceof Error ? error : new ProviderError("Corrective alternative expansion failed");
  }
  const corrected = validateAlternative(result, initialIdea, path, previouslyExplored, currentOptions, [...rejectedOptions, ...validation.rejectedOptions]);
  if (!corrected.ok) throw new ProviderError(`Corrective alternative expansion was invalid: ${corrected.reasons.join("; ")}`);
  return corrected.result;
}

export const expand = expandIdea;
