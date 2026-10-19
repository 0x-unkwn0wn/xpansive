import assert from "node:assert/strict";
import { buildSelectedBranchContext, buildSynthesisContext } from "@/lib/ai/context";
import { addGeneratedOptions, createExploration, setNodeConclusion, setNodeFavorite } from "@/lib/exploration-tree";
import { ComparisonResultSchema, ExplorationSynthesisSchema } from "@/lib/schemas/convergence";

const option = (title: string) => ({ title, description: `A concrete direction about ${title}.` });

let state = createExploration("Grow Xpansive", "en");
state.goal = "Find the first 100 users";
state.constraints = ["No paid acquisition"];
state = addGeneratedOptions(state, state.rootNodeId, [option("Product"), option("Distribution"), option("Partnerships")]);
const children = Object.values(state.nodes).filter((node) => node.parentId === state.rootNodeId);
assert.equal(buildSelectedBranchContext(state, [children[0].id]).length, 1);
assert.equal(buildSelectedBranchContext(state, [children[0].id, "missing"]).length, 1);
assert.equal(buildSynthesisContext(state).goal, "Find the first 100 users");
assert.deepEqual(buildSynthesisContext(state).constraints, ["No paid acquisition"]);
assert.ok(buildSynthesisContext(state).branches.length <= 28, "Synthesis context is bounded");

state = setNodeFavorite(state, children[1].id, true);
state = setNodeConclusion(state, children[2].id, true);
assert.equal(state.conclusionNodeId, children[2].id);
assert.equal(state.resolutionStatus, "resolved");
assert.equal(state.nodes[children[2].id].state, "conclusion");
assert.equal(state.nodes[children[1].id].state, "favorite");
state = setNodeConclusion(state, children[0].id, true);
assert.equal(state.conclusionNodeId, children[0].id, "Changing conclusion replaces the previous one");
assert.equal(state.nodes[children[2].id].state, "active");
state = setNodeConclusion(state, children[0].id, false);
assert.equal(state.resolutionStatus, "active");
assert.equal(state.conclusionNodeId, undefined);

const validComparison = { comparisons: children.slice(0, 2).map((node) => ({ nodeId: node.id, title: node.title, strengths: ["Useful"], weaknesses: ["Cost"], risks: ["Execution"], assumptions: ["Demand"] })), keyDifferences: ["Different paths"], tradeOffs: ["Speed versus depth"], situations: ["Depends on constraints"] };
assert.equal(ComparisonResultSchema.safeParse(validComparison).success, true);
assert.equal(ComparisonResultSchema.safeParse({ comparisons: [validComparison.comparisons[0]] }).success, false, "Compare requires at least two branches");
assert.equal(ExplorationSynthesisSchema.safeParse({ whatWasExplored: "The exploration considered several concrete directions and their consequences.", strongestDirections: [], keyTradeoffs: ["Speed versus depth"], importantAssumptions: ["There is an identifiable early audience"], risks: ["The channel may be expensive"], openQuestions: ["Which signal appears first?"], recommendedDirection: { nodeId: children[0].id, title: children[0].title, rationale: "It matches the goal while respecting the constraint." }, nextActions: ["Run a small test"], sourceRevision: 2, createdAt: new Date().toISOString() }).success, true);
console.log("Convergence context, conclusion state and structured contracts passed.");
