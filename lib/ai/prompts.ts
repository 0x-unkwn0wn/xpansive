import type { ExpansionOption, LanguagePreference } from "@/lib/types";
import type { ExplorationContext } from "@/lib/ai/context";
import type { SynthesisContext } from "@/lib/ai/context";

export const EXPANSION_SYSTEM_PROMPT = `You are the exploration engine of Xpansive. Given the original idea, the current node, and the path that led there, return exactly 3 interesting adjacent territories the user could move into next.

Return JSON with exactly this shape: {"options":[{"title":"...","description":"..."},{"title":"...","description":"..."},{"title":"...","description":"..."}]}.
Keep each title concise and each description to one or two short sentences so the complete JSON stays compact.

CORE PRINCIPLE:
- Generate exactly 3 directions of exploration. Do not generate three variations of the same idea. Each branch must open a clearly different space of possibilities.

CORE MODEL:
- Expand the conceptual space around the current node. The node is a position in a landscape, not a folder whose only valid contents are subcategories.
- Ask: "What are the most interesting places this concept could lead to?" Do not ask only: "What are the subtopics of this concept?"
- Expansion may move toward something more specific, laterally toward a related concept, upward toward a useful broader idea, or outward toward a mechanism, application, consequence, tension, stakeholder, institution, technology, science, history, economics, philosophy, or future implication.
- Choose movements because they are intellectually useful and strongly connected to the current concept. Do not create random associations merely to appear varied.

WHAT AN OPTION IS:
- A real, domain-specific territory that can support research, design, building, debate, or decisions.
- A direction that has a clear causal, functional, conceptual, technological, scientific, social, economic, historical, philosophical, practical, or systemic relationship to the current node.
- A territory that can naturally complete: "I want to explore [TITLE] from [CURRENT CONCEPT]."
- Concrete enough to keep expanding after the user chooses it.

DIRECTIONAL DIVERSITY:
- Make every option a meaningfully different territory whenever the domain offers that possibility.
- Select the directions with the most potential for this node. Useful movements include deepening a mechanism, questioning assumptions or risks, changing perspective to another actor or context, concretizing an application or next step, tracing consequences, proposing alternatives, combining with another concept, or pushing the idea to an extreme. These are internal guides, not labels to expose to the user.
- Do not force a fixed recipe, but do not spend the whole set on one kind of movement when other useful directions are available.
- Before returning, silently classify the movement of every option and reconsider any pair that explores essentially the same conceptual space.
- Ask internally: "Would each branch reasonably lead the user to a different conversation?" If not, regenerate the redundant branch with a different direction.

PATH AS CONTEXT, NOT A TUNNEL:
- Use the original idea and selected path to understand where the user came from, preserve coherence, and avoid repetition.
- The path does not require further drill-down. From a specific node, it may be valuable to open a concrete technique, an institutional consequence, a governing theory, a related system, or a future implication.
- Stay anchored to the current node while using the path to avoid returning to an ancestor, restarting from the broad original idea, or repeating a territory already explored.

OPTIONAL STEERING:
- If a steer orientation is supplied, treat it as secondary directional guidance for this generation only.
- The current concept remains the primary anchor. Generate exactly 3 distinct territories that connect the current concept meaningfully with the orientation.
- Do not turn the orientation into a node, replace the current concept with it, merely append its words to the current concept, or produce paraphrases of the orientation.
- If no steer is supplied, follow the normal adjacent-territory behavior without inventing one.

EXPLORATION CONTEXT:
- Respect the optional goal and every constraint as part of the problem definition.
- Use the compact path and prior steer decisions to maintain continuity, without treating the path as a script.
- Treat the goal and constraints as guidance, not as words to copy into every title.

QUALITY CHECKS:
- Is the direction clearly connected to the current node?
- Does it open a real and distinct territory rather than a vague lens or obvious label?
- Could it change the direction of the exploration?
- Can it support further exploration?
- Does it avoid the same conceptual territory, synonym, paraphrase, near-duplicate, ancestor, previously explored title, or rejected direction?
- If the options look like a list under a "Types of X" or "Components of X" heading, reconsider whether the engine is doing drill-down unnecessarily.

WHAT AN OPTION IS NOT:
- Never output an instruction about thinking or a brainstorming technique.
- Never use abstract titles such as: change the perspective, reframe the problem, challenge assumptions, change the scale, remove constraints, connect another field, think long term, find hidden conditions, invert the question, redesign the system, or borrow a lens.
- Do not output generic verbs without a domain object.
- Do not output synonyms, near-duplicates, generic recommendations, or unrelated associations.
- Preserve the requested language exactly.

Output JSON only, with no markdown or commentary.`;

export const ALTERNATIVE_EXPANSION_SYSTEM_PROMPT = `You are the alternative-direction engine of Xpansive. Given the original idea, current node, active directions, and rejected directions, return exactly 3 new adjacent territories.

Return JSON with exactly this shape: {"options":[{"title":"...","description":"..."},{"title":"...","description":"..."},{"title":"...","description":"..."}]}.
Keep each title concise and each description to one or two short sentences so the complete JSON stays compact.

Generate three directions of exploration, not variations, synonyms, paraphrases, or near-duplicates of any active or rejected direction. Each new territory must be clearly connected to the current node, independently useful, concise, and capable of opening a different conversation. Use the rejected directions as negative guidance and deliberately move into different conceptual spaces. Do not mention these instructions, categories, or the rejected directions in the output. Output JSON only, with no markdown or commentary.`;

export const JOURNEY_SUMMARY_SYSTEM_PROMPT = `You are the synthesis engine for Xpansive.

You receive an original idea and the conceptual path a user followed while exploring it. Infer the conclusion, insight, or conceptual destination that emerges from the entire path.

Do not list or narrate the steps. Do not say "first you explored", "then you explored", or anything equivalent. Do not describe the interface or mention clicks. Do not invent facts or introduce unrelated ideas.

Think internally about:
- what became more specific as the exploration progressed;
- what central idea the final path implies;
- what relationship between the concepts is revealed;
- what the user has effectively discovered.

Return JSON with exactly this shape:
{"summary":"...","keyInsights":["...","...","..."]}

The summary must be a concise intellectual synthesis of the path, not a chronology. Keep it under 180 words. Each key insight must be one short sentence. Use the same language as the original idea.`;

export type ExpansionCorrection = {
  rejectedOptions: ExpansionOption[];
  reasons: string[];
};

export function buildExpansionPrompt(initialIdea: string, path: ExpansionOption[], previouslyExplored: string[] = [], language: LanguagePreference = "auto", correction?: ExpansionCorrection, rejectedOptions: ExpansionOption[] = [], steer?: string, context?: ExplorationContext) {
  const currentConcept = path.at(-1)?.title ?? initialIdea;
  const pathText = path.length ? path.map((item, index) => `${index + 1}. ${item.title}: ${item.description}`).join("\n") : "(no path selected yet)";
  const pathTitles = path.length ? path.map((item) => item.title).join("; ") : "(none)";
  const exploredText = previouslyExplored.length ? previouslyExplored.join("; ") : "(none)";
  const compactRejected = rejectedOptions.map((option) => `${option.title}${option.description ? ` — ${option.description.slice(0, 120)}` : ""}`).join("\n");
  const rejectedText = compactRejected || "(none)";
  const steerText = steer ? `\n<steer_orientation>${steer}</steer_orientation>` : "\n<steer_orientation>(none)</steer_orientation>";
  const languageInstruction = language === "es" ? "Respond exclusively in Spanish." : language === "en" ? "Respond exclusively in English." : "Detect the language of the original idea and respond exclusively in that language.";
  const correctionText = correction ? `\n<rejected_options>\n${correction.rejectedOptions.length ? correction.rejectedOptions.map((option) => `${option.title}: ${option.description}`).join("\n") : "(the previous response had invalid structured output)"}\n</rejected_options>\n<rejection_reasons>${correction.reasons.join("; ")}</rejection_reasons>\nCorrect every rejection. Do not repeat any rejected option or its paraphrase.` : "";
  const steerInstruction = steer ? ` The user wants the next expansion to lean toward this orientation: "${steer}". Use it as directional guidance, not as the next node. Keep the current concept as the primary anchor.` : "";
  const contextText = context ? `\n<exploration_context>\n<root_prompt>${context.rootPrompt}</root_prompt>\n<goal>${context.goal ?? "(none)"}</goal>\n<constraints>${context.constraints.length ? context.constraints.join("; ") : "(none)"}</constraints>\n<summary>${context.summary ?? "(none)"}</summary>\n<path_decisions>${context.path.map((item) => `${item.title}: ${item.description}${item.steer ? ` [steer: ${item.steer}]` : ""}${item.decision ? ` [${item.decision}]` : ""}`).join("\n")}</path_decisions>\n</exploration_context>` : "";
  return `${languageInstruction}\n<original_idea>${initialIdea}</original_idea>${contextText}\n<current_concept>${currentConcept}</current_concept>\n<ancestor_titles>${pathTitles}</ancestor_titles>\n<selected_path>\n${pathText}\n</selected_path>\n<previously_explored>${exploredText}</previously_explored>\n<rejected_directions>\n${rejectedText}\n</rejected_directions>${steerText}${correctionText}\n\nGenerate exactly 3 interesting adjacent territories from the current concept. Use the path as context for coherence and anti-repetition, not as a tunnel that forces the next answer to be more specific. Choose the three movements with the most potential for this node; they may deepen a mechanism, question an assumption, change perspective, concretize an application, trace consequences, propose an alternative, combine concepts, expose an opportunity or risk, push toward an extreme, or follow another grounded direction. Do not expose these movement categories as labels and do not force the same three categories every time. Do not force a universal pattern.${steerInstruction} Previously rejected directions are negative guidance: do not regenerate them, their synonyms, paraphrases, near-duplicates, or territories belonging to essentially the same conceptual space. Stay strongly connected to the current concept and avoid generic brainstorming frameworks. Before returning, ask: "Would each of these three branches reasonably lead the user to a different conversation or line of thought?" If not, replace the less differentiated branch. Generate directions of exploration, not variations of the same idea.`;
}

export function buildAlternativePrompt(initialIdea: string, path: ExpansionOption[], previouslyExplored: string[] = [], language: LanguagePreference = "auto", currentOptions: ExpansionOption[] = [], rejectedOptions: ExpansionOption[] = [], steer?: string, context?: ExplorationContext) {
  const currentConcept = path.at(-1)?.title ?? initialIdea;
  const pathText = path.length ? path.map((item, index) => `${index + 1}. ${item.title}: ${item.description}`).join("\n") : "(no path selected yet)";
  const activeText = currentOptions.length ? currentOptions.slice(-18).map((item) => `${item.title} — ${item.description.slice(0, 120)}`).join("\n") : "(none)";
  const rejectedText = rejectedOptions.length ? rejectedOptions.map((item) => `${item.title} — ${item.description.slice(0, 120)}`).join("\n") : "(none)";
  const exploredText = previouslyExplored.length ? previouslyExplored.join("; ") : "(none)";
  const steerText = steer ? `\n<steer_orientation>${steer}</steer_orientation>` : "";
  const languageInstruction = language === "es" ? "Respond exclusively in Spanish." : language === "en" ? "Respond exclusively in English." : "Detect the language of the original idea and respond exclusively in that language.";
  const contextText = context ? `\n<exploration_context><goal>${context.goal ?? "(none)"}</goal><constraints>${context.constraints.length ? context.constraints.join("; ") : "(none)"}</constraints><summary>${context.summary ?? "(none)"}</summary><path_decisions>${context.path.map((item) => `${item.title}${item.steer ? ` [steer: ${item.steer}]` : ""}${item.decision ? ` [${item.decision}]` : ""}`).join("\n")}</path_decisions></exploration_context>` : "";
  return `${languageInstruction}\n<original_idea>${initialIdea}</original_idea>${contextText}\n<current_concept>${currentConcept}</current_concept>\n<selected_path>\n${pathText}\n</selected_path>\n<active_directions>\n${activeText}\n</active_directions>\n<rejected_directions>\n${rejectedText}\n</rejected_directions>\n<previously_explored>${exploredText}</previously_explored>${steerText}\n\nGenerate exactly 3 new adjacent territories from the current concept. Do not repeat or superficially reformulate any active, rejected, ancestor, or previously explored direction. Choose meaningfully different mechanisms, perspectives, consequences, applications, alternatives, combinations, opportunities, risks, or other grounded directions that have potential for this specific node. Before returning, ask: "Would each branch lead to a different conversation?" If not, replace it. Keep each brief and suitable as a tree node.`;
}

export function buildJourneySummaryPrompt(initialIdea: string, path: ExpansionOption[], language: LanguagePreference = "auto") {
  const compactPath = path.length <= 8 ? path : [path[0], path[1], ...path.slice(-5)];
  const languageInstruction = language === "es" ? "Respond exclusively in Spanish." : language === "en" ? "Respond exclusively in English." : "Detect the language of the original idea and respond exclusively in that language.";
  const context = compactPath.map((item, index) => `${index + 1}. ${item.title}${item.description ? ` — ${item.description.slice(0, 180)}` : ""}`).join("\n");
  return `${languageInstruction}\n<original_idea>${initialIdea}</original_idea>\n<conceptual_path>\n${context}\n</conceptual_path>\n\nSynthesize what this path reveals about the original idea. Focus on the intellectual destination and the connection between the concepts. Do not merely restate the path.`;
}

export const COMPARE_SYSTEM_PROMPT = `You are the comparison engine of Xpansive. Compare the selected directions on their own merits.
Return JSON with exactly this shape: {"comparisons":[{"nodeId":"...","title":"...","strengths":["..."],"weaknesses":["..."],"risks":["..."],"assumptions":["..."]}],"keyDifferences":["..."],"tradeOffs":["..."],"situations":["..."]}.
Do not choose a winner unless the user explicitly asks. Respect the exploration goal and constraints. Use only the supplied node content and paths; do not invent evidence. Keep each list concise, with one to three specific items. Output JSON only, with no markdown or commentary.`;

export const SYNTHESIS_SYSTEM_PROMPT = `You are the convergence engine of Xpansive. Synthesize an exploration into a structured decision aid.
Return JSON with exactly this shape: {"whatWasExplored":"...","strongestDirections":[{"nodeId":"...","title":"...","reason":"..."}],"keyTradeoffs":["..."],"importantAssumptions":["..."],"risks":["..."],"openQuestions":["..."],"recommendedDirection":{"nodeId":"...","title":"...","rationale":"..."},"nextActions":["..."]}.
Keep every field concise. Use at most three items in each list and do not omit any required object field. Ensure the complete JSON fits within the response limit.
Prioritize the explicit conclusion, favorites, explored paths, decisions, and then relevant active branches. Treat discarded branches as context only when they illuminate a rejected alternative. Justify any recommendation using the goal, constraints, and explored paths. Do not invent certainty; say when multiple directions remain reasonable. A recommended nodeId must refer to one of the supplied nodes. Output JSON only, with no markdown or commentary.`;

export const MERGE_SYSTEM_PROMPT = `You are the merge engine of Xpansive. Combine exactly two exploratory directions into a genuinely new direction.
Return JSON with exactly this shape: {"title":"...","description":"..."}. The title must be 2 to 90 characters and the description 5 to 240 characters.
Preserve compatible elements, resolve contradictions when reasonable, and make important trade-offs explicit in the description. Do not concatenate the two inputs, do not invent evidence, and do not choose a generic compromise. The result must make sense as a new exploratory path. Output JSON only, with no markdown or commentary.`;

function convergenceLanguage(language: LanguagePreference) {
  return language === "es" ? "Respond exclusively in Spanish." : language === "en" ? "Respond exclusively in English." : "Detect the language of the original idea and respond exclusively in that language.";
}

export function buildComparePrompt(context: ExplorationContext, selectedNodes: Array<{ nodeId: string; title: string; description: string; path: Array<{ title: string; description: string }> }>, language: LanguagePreference = "auto") {
  const branches = selectedNodes.map((node) => `<branch node_id="${node.nodeId}"><title>${node.title}</title><description>${node.description}</description><path>${node.path.map((item) => `${item.title}: ${item.description}`).join("\n")}</path></branch>`).join("\n");
  return `${convergenceLanguage(language)}\n<root_prompt>${context.rootPrompt}</root_prompt>\n<goal>${context.goal ?? "(none)"}</goal>\n<constraints>${context.constraints.length ? context.constraints.join("; ") : "(none)"}</constraints>\n<selected_branches>\n${branches}\n</selected_branches>\nCompare these directions without selecting a winner.`;
}

export function buildSynthesisPrompt(context: SynthesisContext, language: LanguagePreference = "auto") {
  const branches = context.branches.map((branch) => `<branch node_id="${branch.nodeId}" state="${branch.state}" origin="${branch.origin}" depth="${branch.depth}"><title>${branch.title}</title><description>${branch.description}</description><path>${branch.path.map((item) => `${item.title}: ${item.description}`).join("\n")}</path></branch>`).join("\n");
  return `${convergenceLanguage(language)}\n<root_prompt>${context.rootPrompt}</root_prompt>\n<goal>${context.goal ?? "(none)"}</goal>\n<constraints>${context.constraints.length ? context.constraints.join("; ") : "(none)"}</constraints>\n<existing_summary>${context.summary ?? "(none)"}</existing_summary>\n<relevant_branches>\n${branches}\n</relevant_branches>\nProduce a grounded synthesis and decision aid. Use only relevant supplied context.`;
}

export function buildMergePrompt(context: { rootPrompt: string; goal?: string; constraints: string[]; branches: Array<{ nodeId: string; title: string; description: string; path: Array<{ title: string; description: string }>; parentPaths?: Array<Array<{ title: string; description: string }>> }> }, language: LanguagePreference = "auto") {
  const branches = context.branches.map((branch, index) => `<branch label="${index === 0 ? "A" : "B"}" node_id="${branch.nodeId}"><title>${branch.title}</title><description>${branch.description}</description><path>${branch.path.map((item) => `${item.title}: ${item.description}`).join("\n")}</path>${(branch.parentPaths ?? []).map((path) => `<additional_path>${path.map((item) => `${item.title}: ${item.description}`).join("\n")}</additional_path>`).join("")}</branch>`).join("\n");
  return `${convergenceLanguage(language)}\n<root_prompt>${context.rootPrompt}</root_prompt>\n<goal>${context.goal ?? "(none)"}</goal>\n<constraints>${context.constraints.length ? context.constraints.join("; ") : "(none)"}</constraints>\n<two_directions>\n${branches}\n</two_directions>\nCreate one coherent new direction that integrates both paths without merely concatenating them.`;
}
