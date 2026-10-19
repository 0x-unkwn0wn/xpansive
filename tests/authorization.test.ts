import assert from "node:assert/strict";
import { canEditExploration, isActiveBetaStatus, isAdminRole } from "@/lib/authorization";

assert.equal(isActiveBetaStatus("active"), true, "active beta access is allowed");
assert.equal(isActiveBetaStatus("pending"), false, "pending beta access is not allowed");
assert.equal(isActiveBetaStatus("revoked"), false, "revoked beta access is not allowed");
assert.equal(isAdminRole("admin"), true, "only the explicit admin role is privileged");
assert.equal(isAdminRole("user"), false, "normal users are not administrators");
assert.equal(canEditExploration("user-a", "user-a", false), true, "an owner can edit");
assert.equal(canEditExploration("user-a", "user-b", true), false, "an edit proof cannot override another authenticated owner");
assert.equal(canEditExploration("user-a", null, true), true, "a legacy exploration can be claimed with its edit proof");
assert.equal(canEditExploration("user-a", null, false), false, "an id without an edit proof cannot claim a legacy exploration");

console.log("Authorization access, revocation, and ownership checks passed.");
