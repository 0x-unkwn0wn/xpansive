import assert from "node:assert/strict";
import { createEditToken, hashEditToken, nodeToPersistence, verifyEditToken } from "@/lib/db/persistence";
import { createExploration } from "@/lib/exploration-tree";
import { PersistExplorationSchema } from "@/lib/schemas/persistence";

const token = createEditToken();
assert.equal(token.length >= 40, true, "Edit tokens must have enough entropy");
assert.equal(verifyEditToken(hashEditToken(token), token), true, "The owner token must verify");
assert.equal(verifyEditToken(hashEditToken(token), `${token}x`), false, "A different token must not verify");

const state = createExploration("A private idea", "en");
const persisted = nodeToPersistence(state.nodes[state.rootNodeId]);
assert.equal("children" in persisted, false, "Normalized nodes must not store derived child arrays");
assert.equal("expansionCache" in persisted, false, "Normalized nodes must not store raw expansion caches");
assert.equal(PersistExplorationSchema.safeParse({ revision: 0, currentNodeId: state.rootNodeId, nodes: [persisted], steer: null }).success, true);
assert.equal(PersistExplorationSchema.safeParse({ revision: -1, currentNodeId: state.rootNodeId, nodes: [persisted] }).success, false);

console.log("Persistence normalization and anonymous ownership tests passed.");
