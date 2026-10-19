import assert from "node:assert/strict";
import { explorationEventKey, getProductEventsRetentionDays, productEventNames } from "@/lib/product-events";
import { ExplorationEventRequestSchema } from "@/lib/schemas/product-events";

assert.equal(productEventNames.includes("generation_succeeded"), true);
assert.equal(productEventNames.includes("generation_failed"), true);
assert.equal(productEventNames.includes("exploration_goal_set"), true);
assert.equal(productEventNames.includes("constraint_added"), true);
assert.equal(productEventNames.includes("branch_favorited"), true);
assert.equal(productEventNames.includes("steer_applied"), true);
assert.equal(productEventNames.includes("branch_generated"), true);
assert.equal(productEventNames.includes("manual_branch_added"), true);
assert.equal(productEventNames.includes("compare_started"), true);
assert.equal(productEventNames.includes("compare_completed"), true);
assert.equal(productEventNames.includes("merge_started"), true);
assert.equal(productEventNames.includes("merge_completed"), true);
assert.equal(productEventNames.includes("synthesis_requested"), true);
assert.equal(productEventNames.includes("synthesis_completed"), true);
assert.equal(productEventNames.includes("synthesis_regenerated"), true);
assert.equal(productEventNames.includes("conclusion_marked"), true);
assert.equal(productEventNames.includes("conclusion_changed"), true);
assert.equal(productEventNames.includes("conclusion_removed"), true);
assert.equal(productEventNames.includes("exploration_resolved"), true);
assert.equal(productEventNames.includes("share_opened_by_recipient"), true);
assert.equal(productEventNames.includes("fork"), true);
assert.equal(productEventNames.includes("node_forked"), true);

const first = explorationEventKey("0123456789abcdef0123456789abcdef");
assert.equal(first, explorationEventKey("0123456789abcdef0123456789abcdef"));
assert.notEqual(first, "0123456789abcdef0123456789abcdef");
assert.notEqual(first, explorationEventKey("fedcba9876543210fedcba9876543210"));

assert.equal(ExplorationEventRequestSchema.safeParse({ eventName: "branch_selected", operationId: "0123456789abcdef" }).success, true);
assert.equal(ExplorationEventRequestSchema.safeParse({ eventName: "generation_succeeded", operationId: "0123456789abcdef" }).success, false);
assert.equal(ExplorationEventRequestSchema.safeParse({ eventName: "branch_selected", operationId: "idea with spaces" }).success, false);

process.env.PRODUCT_EVENTS_RETENTION_DAYS = "0";
assert.equal(getProductEventsRetentionDays(), 1);
process.env.PRODUCT_EVENTS_RETENTION_DAYS = "not-a-number";
assert.equal(getProductEventsRetentionDays(), 180);

console.log("Product event catalog, pseudonymous references, validation and retention checks passed.");
