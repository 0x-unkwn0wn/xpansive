import assert from "node:assert/strict";
import { expansionsAreTooSimilar, normalizeTitle, validateExpansion } from "@/lib/ai/expand";
import { mockExpansion } from "@/lib/ai/mock";
import { buildAlternativePrompt, buildExpansionPrompt, EXPANSION_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { applyAlternativeBatch, alternativesAreAvailable, rejectedOptionsForAlternative } from "@/lib/alternatives";
import { addGeneratedOptions, addManualBranch, createExploration, discardNode, getActiveChildren, getActivePath, getChildren, getExplorationNegativeOptions, hasGeneratedChildren, replaceActiveSuggestionsWithSteer, restoreNode, restoreSuggestion, setActiveNode, setNodeFavorite } from "@/lib/exploration-tree";
import { buildExplorationContext } from "@/lib/ai/context";
import { expansionCacheKey } from "@/lib/journey";
import { ExpandRequestSchema } from "@/lib/schemas/expansion";
import { validateSteer } from "@/lib/steer";
import { getCopy } from "@/lib/i18n";
import type { ExpansionOption } from "@/lib/types";

const option = (title: string): ExpansionOption => ({ title, description: `A concrete territory about ${title}.` });
const result = (titles: string[]) => ({ options: titles.map(option) });

function assertInvalid(message: string, value: ReturnType<typeof result>, initialIdea: string, path: ExpansionOption[] = []) {
  assert.equal(validateExpansion(value, initialIdea, path).ok, false, message);
}

assert.equal(normalizeTitle("Artificial Intelligence"), normalizeTitle("AI"));
assert.equal(normalizeTitle("Increase human capabilities"), normalizeTitle("Extend human abilities"));
assertInvalid("A → A must be rejected", result(["A", "C", "D"]), "A");
assertInvalid("A → B → B must be rejected", result(["B", "C", "D"]), "A", [option("B")]);
assertInvalid("A → B → A must be rejected", result(["A", "C", "D"]), "A", [option("B")]);
assertInvalid("Duplicate options must be rejected", result(["Faster movement", "Faster movement", "Bring services closer"]), "Transportation");

const valid = validateExpansion(result(["Faster movement", "Less need to move", "Bring services closer"]), "Transportation");
assert.equal(valid.ok, true, "Three concrete, distinct territories should be accepted");
assert.equal(validateExpansion({ options: [
  { title: "Feed discovery", description: "How people discover posts without following anyone." },
  option("Distinct territory"),
  option("Another territory"),
] }, "A social network", [], [], [
  { title: "Content discovery", description: "How people find posts without following anyone." },
]).ok, false, "A semantic near-duplicate of a rejected direction must be rejected");
assert.match(EXPANSION_SYSTEM_PROMPT, /directions of exploration/i);
assert.match(EXPANSION_SYSTEM_PROMPT, /do not generate three variations of the same idea/i);
assert.match(EXPANSION_SYSTEM_PROMPT, /different conversation/i);
assert.match(buildExpansionPrompt("Adaptive tutor", [option("Education")], [], "en"), /path as context for coherence and anti-repetition, not as a tunnel/i);
assert.match(buildExpansionPrompt("Adaptive tutor", [], [], "en"), /Generate exactly 3 interesting adjacent territories/i);
assert.match(buildExpansionPrompt("Transportation", [], [], "en", undefined, [], "psychology"), /steering|orientation/i);
assert.match(buildAlternativePrompt("Transportation", [], [], "en", [option("Trains")], [option("Cars")]), /Generate exactly 3 new adjacent territories/i);
const longNegativeMemory = Array.from({ length: 40 }, (_, index) => option(`Discarded direction ${index + 1}`));
assert.match(buildExpansionPrompt("Transportation", [], [], "en", undefined, longNegativeMemory), /Discarded direction 40/);

assert.equal(expansionsAreTooSimilar(option("Build a follower network"), option("Create a follower network")), true);
assert.equal(expansionsAreTooSimilar({ title: "Content discovery", description: "How people find posts without following anyone." }, { title: "Onboarding", description: "How a new member enters a network without followers." }), false);
assert.equal(validateExpansion({ options: [
  { title: "Content discovery", description: "How people find posts without following anyone." },
  { title: "Feed discovery", description: "How people discover posts without following anyone." },
  { title: "Network governance", description: "Who sets the rules and resolves disputes in the community." },
] }, "A social network without followers").ok, false, "Conceptually redundant directions must be regenerated");

const parsedSteerRequest = ExpandRequestSchema.parse({ initialIdea: "Transportation", path: [], current: "Transportation", steer: "  psychology   ", provider: "openai", model: "test-model" });
assert.equal(parsedSteerRequest.steer, "psychology");
assert.equal(ExpandRequestSchema.safeParse({ initialIdea: "Transportation", path: [], steer: "!!!", provider: "openai", model: "test-model" }).success, false);
assert.equal(validateSteer("  cities   small  ").value, "cities small");
assert.equal(getCopy("es").steer, "ORIENTAR");
assert.equal(getCopy("en").steer, "STEER");

const steered = mockExpansion("Transportation", [], "en", [], "psychology").options;
assert.deepEqual(steered.map((item) => item.title), ["Perceived travel time", "Travel stress", "Sense of control"]);
assert.equal(expansionCacheKey("Transportation", [], [], "en") === expansionCacheKey("Transportation", [], [], "en", "psychology"), false);
assert.notEqual(expansionCacheKey("Transportation", [], [], "en"), expansionCacheKey("Transportation", [], [option("Discarded direction")], "en"), "Global negative memory must invalidate the expansion cache");

for (const concept of ["Artificial intelligence", "Adaptive tutor", "Transportation", "Coffee", "Restaurants", "Sleep", "Cities", "Memory", "Music", "Energy"]) {
  const options = mockExpansion(concept, [], "en").options;
  assert.equal(options.length, 3, `${concept} should produce exactly three directions`);
  assert.equal(validateExpansion({ options }, concept).ok, true, `${concept} directions should be valid`);
}

assert.equal(ExpandRequestSchema.parse({ initialIdea: "Transportation", path: [], provider: "openai", model: "test-model" }).initialIdea, "Transportation");

// Tree behaviour: every generated option is persistent and has exactly one parent.
let exploration = createExploration("Artificial intelligence", "en");
const rootOptions = [option("Agents"), option("Capabilities"), option("Science")];
exploration = addGeneratedOptions(exploration, exploration.rootNodeId, rootOptions);
const rootChildren = getChildren(exploration, exploration.rootNodeId);
assert.deepEqual(rootChildren.map((node) => node.title), ["Agents", "Capabilities", "Science"]);
assert.equal(rootChildren.every((node) => node.status === "available"), true);

const agents = rootChildren[0];
exploration = setActiveNode(exploration, agents.id);
assert.equal(exploration.nodes[agents.id].status, "explored");
assert.deepEqual(getChildren(exploration, exploration.rootNodeId).map((node) => node.title), ["Agents", "Capabilities", "Science"]);
const agentOptions = [option("Learning"), option("Delegation"), option("Trust")];
exploration = addGeneratedOptions(exploration, agents.id, agentOptions);
assert.deepEqual(getActiveChildren(exploration).map((node) => node.title), ["Learning", "Delegation", "Trust"]);
assert.equal(getChildren(exploration, agents.id).length, 3);

const capabilities = getChildren(exploration, exploration.rootNodeId)[1];
exploration = setActiveNode(exploration, capabilities.id);
exploration = addGeneratedOptions(exploration, capabilities.id, [option("Learning systems"), option("Human augmentation"), option("Measurement")]);
assert.equal(getChildren(exploration, agents.id).length, 3, "The first branch must remain intact");
assert.equal(getChildren(exploration, capabilities.id).length, 3, "The second branch must be added independently");
assert.deepEqual(getActivePath(exploration).map((item) => item.title), ["Capabilities"]);

const backToAgents = setActiveNode(exploration, agents.id);
assert.equal(hasGeneratedChildren(backToAgents, agents.id), true);
assert.deepEqual(getActiveChildren(backToAgents).map((node) => node.title), ["Learning", "Delegation", "Trust"]);

const activeBatch = getActiveChildren(backToAgents).map(({ title, description }) => ({ title, description }));
assert.deepEqual(rejectedOptionsForAlternative(backToAgents.nodes[agents.id], activeBatch), activeBatch);
const alternativeNode = applyAlternativeBatch(backToAgents.nodes[agents.id], [option("Safety"), option("Governance"), option("Access")], activeBatch);
assert.equal(alternativeNode.alternativeGenerationCount, 1);
assert.equal(alternativeNode.rejectedOptions.length, 3);
assert.equal(alternativesAreAvailable(alternativeNode, 3), true);

const steeredRoot = replaceActiveSuggestionsWithSteer(backToAgents, backToAgents.rootNodeId, [option("Public infrastructure"), option("Safety policy"), option("Human capability")]);
assert.equal(steeredRoot.nodes[agents.id].branchStatus, "active", "Explored branches must remain in the tree after Steer");
assert.equal(steeredRoot.nodes[capabilities.id].branchStatus, "active", "Other explored branches must remain in the tree after Steer");
assert.deepEqual(getActiveChildren(steeredRoot, steeredRoot.rootNodeId).map((node) => node.title), ["Public infrastructure", "Safety policy", "Human capability"]);
assert.equal(steeredRoot.nodes[steeredRoot.rootNodeId].suggestionHistory.length, 1, "Un-explored suggestions move to history");
assert.equal(getExplorationNegativeOptions(steeredRoot).some((item) => item.title === "Science"), true, "Steer-replaced suggestions are global negative memory");
const restoredSuggestion = restoreSuggestion(steeredRoot, steeredRoot.rootNodeId, steeredRoot.nodes[steeredRoot.rootNodeId].suggestionHistory[0].id);
assert.equal(getActiveChildren(restoredSuggestion, restoredSuggestion.rootNodeId).some((node) => node.title === "Science"), true, "History can be restored");
assert.equal(getExplorationNegativeOptions(restoredSuggestion).some((item) => item.title === "Science"), false, "Restored suggestions leave negative memory");

const emptied = getActiveChildren(restoredSuggestion, restoredSuggestion.rootNodeId).reduce((state, child) => discardNode(state, child.id), restoredSuggestion);
assert.equal(getActiveChildren(emptied, emptied.rootNodeId).length, 0, "Discarding all suggestions does not auto-regenerate");

const withFourthBranch = addGeneratedOptions(backToAgents, agents.id, [option("Safety")]);
assert.equal(getActiveChildren(withFourthBranch, agents.id).length, 4, "A node can keep more than three active branches");
const fourthBranch = getActiveChildren(withFourthBranch, agents.id).find((node) => node.title === "Safety")!;
const pruned = discardNode(withFourthBranch, fourthBranch.id);
assert.equal(pruned.nodes[fourthBranch.id].branchStatus, "discarded");
assert.equal(getActiveChildren(pruned, agents.id).length, 3, "Discarded branches disappear from active children");
assert.equal(pruned.nodes[agents.id].rejectedOptions.some((item) => item.title === "Safety"), true, "Discarded directions remain as generation context");
assert.equal(getExplorationNegativeOptions(pruned).some((item) => item.title === "Safety"), true, "Discarded directions are remembered across branches");
assert.equal(validateExpansion({ options: [option("Safety"), option("Different territory"), option("Another territory")] }, "Artificial intelligence", [], [], getExplorationNegativeOptions(pruned)).ok, false, "A discard in one branch blocks regeneration from another branch");
const restored = restoreNode(pruned, fourthBranch.id);
assert.equal(restored.nodes[fourthBranch.id].branchStatus, "active");
assert.equal(getActiveChildren(restored, agents.id).length, 4, "Undo restores the branch");
assert.equal(getExplorationNegativeOptions(restored).some((item) => item.title === "Safety"), false, "Restoring a direction removes its negative-memory entry");

// Protected branch state survives a new Steer generation, while unprotected suggestions are discarded.
let protectedState = createExploration("Grow Xpansive", "en");
protectedState.goal = "Find the first 100 users";
protectedState.constraints = ["No paid acquisition"];
protectedState = addGeneratedOptions(protectedState, protectedState.rootNodeId, [option("Product"), option("Distribution"), option("Pricing")]);
const protectedChild = getActiveChildren(protectedState)[0];
protectedState = setNodeFavorite(protectedState, protectedChild.id, true);
protectedState = addManualBranch(protectedState, protectedState.rootNodeId, option("Manual research"));
const steeredProtected = replaceActiveSuggestionsWithSteer(protectedState, protectedState.rootNodeId, [option("Partnerships"), option("Community"), option("Experiments")]);
assert.equal(steeredProtected.nodes[protectedChild.id].state, "favorite");
assert.equal(getActiveChildren(steeredProtected).some((node) => node.id === protectedChild.id), true);
assert.equal(getActiveChildren(steeredProtected).some((node) => node.origin === "manual"), true);
assert.equal(getActiveChildren(steeredProtected).filter((node) => node.generationId === Object.keys(steeredProtected.generations).at(-1)).length, 3, "A steer generation has exactly three new branches");
assert.equal(steeredProtected.constraints[0], "No paid acquisition");
const context = buildExplorationContext(steeredProtected);
assert.equal(context.goal, "Find the first 100 users");
assert.deepEqual(context.constraints, ["No paid acquisition"]);
assert.match(buildExpansionPrompt("Grow Xpansive", [], [], "en", undefined, [], undefined, context), /Find the first 100 users/);

// Cached generation is represented by the node's cache and must not create duplicates.
const cacheKey = expansionCacheKey("Artificial intelligence", [option("Capabilities")], [], "en");
const cachedOnce = addGeneratedOptions(backToAgents, agents.id, agentOptions, cacheKey);
const cachedTwice = addGeneratedOptions(cachedOnce, agents.id, agentOptions, cacheKey);
assert.equal(getChildren(cachedTwice, agents.id).length, 3);
assert.equal(Object.keys(cachedTwice.nodes[agents.id].expansionCache).length, 1);

console.log("Expansion engine and exploration tree tests passed.");
