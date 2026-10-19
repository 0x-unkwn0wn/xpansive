import assert from "node:assert/strict";
import { addGeneratedOptions, addMergedNode, canMergeNodes, createExploration, getActiveChildren, getChildren, getParentIds, getVisibleChildren, parseExplorationState } from "@/lib/exploration-tree";
import { buildMergeContext, buildSelectedBranchContext } from "@/lib/ai/context";
import { publicExplorationState } from "@/lib/db/persistence";

const option = (title: string) => ({ title, description: `${title} direction with enough detail.` });
let state = createExploration("Design a resilient city", "en");
state = addGeneratedOptions(state, state.rootNodeId, [option("Transit"), option("Housing"), option("Energy")]);
const branches = getChildren(state, state.rootNodeId);
assert.equal(canMergeNodes(state, [branches[0].id, branches[1].id]), true);
assert.equal(canMergeNodes(state, [branches[0].id, branches[0].id]), false, "self merge is invalid");
assert.equal(canMergeNodes(state, [branches[0].id]), false, "merge requires exactly two nodes");

state = addMergedNode(state, [branches[0].id, branches[1].id], { title: "Integrated mobility housing", description: "A new direction balancing access and affordability." });
const merged = Object.values(state.nodes).find((node) => node.origin === "merge");
assert.ok(merged);
assert.deepEqual(getParentIds(merged!), [branches[0].id, branches[1].id]);
assert.equal(getChildren(state, branches[0].id).some((node) => node.id === merged!.id), true);
assert.equal(getChildren(state, branches[1].id).some((node) => node.id === merged!.id), true);
assert.equal(branches[0].mergedInto, undefined, "original references remain immutable");
assert.equal(state.nodes[branches[0].id].mergedInto, merged!.id, "first source branch points to the fusion result");
assert.equal(state.nodes[branches[1].id].mergedInto, merged!.id, "second source branch points to the fusion result");
const activeRootOptions = getActiveChildren(state, state.rootNodeId).map((node) => node.id);
assert.equal(activeRootOptions.includes(branches[0].id), false, "first source branch is no longer an active option");
assert.equal(activeRootOptions.includes(branches[1].id), false, "second source branch is no longer an active option");
assert.equal(activeRootOptions.includes(merged!.id), true, "the fusion result is the active replacement option");
assert.equal(getVisibleChildren(state, state.rootNodeId).some((node) => node.id === branches[0].id), false, "the first source branch is hidden from visible children");
assert.equal(getVisibleChildren(state, state.rootNodeId).some((node) => node.id === branches[1].id), false, "the second source branch is hidden from visible children");
assert.equal(getVisibleChildren(state, state.rootNodeId).some((node) => node.id === merged!.id), true, "the fusion result remains visible");
assert.equal(canMergeNodes(state, [state.rootNodeId, merged!.id]), false, "ancestor/descendant merge would create a cycle");
assert.equal(addMergedNode(state, [branches[0].id, branches[1].id], option("Duplicate")), state, "same merge is idempotently rejected locally");

const selected = buildSelectedBranchContext(state, [merged!.id]);
assert.equal(selected.length, 1);
assert.ok(selected[0].parentPaths?.length, "merged context includes both parent paths");
const mergeContext = buildMergeContext(state, [branches[0].id, branches[1].id]);
assert.equal(mergeContext.branches.length, 2);
assert.equal(mergeContext.rootPrompt, "Design a resilient city");
state.goal = "Improve daily access";
state.conclusionNodeId = merged!.id;
state.resolutionStatus = "resolved";
const shared = publicExplorationState(state);
assert.equal(shared.goal, "Improve daily access", "shared state keeps the product goal");
assert.equal(shared.conclusionNodeId, merged!.id, "shared state keeps the conclusion");
assert.equal(shared.nodes[branches[0].id], undefined, "shared state hides the first source branch");
assert.equal(shared.nodes[branches[1].id], undefined, "shared state hides the second source branch");
assert.ok(shared.nodes[merged!.id], "shared state keeps the fusion result");
assert.equal("apiKey" in shared, false, "shared state contains no provider credential field");

const legacy = parseExplorationState({ id: "legacy", initialIdea: "Old", language: "en", rootNodeId: "root", activeNodeId: "root", nodes: { root: { id: "root", parentId: null, title: "Old", description: "", status: "explored", branchStatus: "active", state: "active", origin: "ai", children: [], activeChildIds: [], activeSuggestionIds: [], suggestionHistory: [], createdAt: new Date().toISOString(), rejectedOptions: [], alternativeGenerationCount: 0, alternativeBatches: [], expansionCache: {} } }, generations: {} });
assert.ok(legacy);
assert.deepEqual(legacy!.nodes.root.parentIds, [], "legacy single-parent data gets a compatible empty root parent list");

console.log("graph/merge tests passed");
