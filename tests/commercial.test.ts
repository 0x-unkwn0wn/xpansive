import assert from "node:assert/strict";
import { commercialPlanDefinitions } from "@/lib/commercial";

for (const plan of ["beta", "free", "pro", "team"] as const) {
  assert.deepEqual(commercialPlanDefinitions[plan].limits, {}, `${plan} has no unvalidated commercial limits`);
  assert.equal(commercialPlanDefinitions[plan].capabilities.explore, true);
  assert.equal(commercialPlanDefinitions[plan].capabilities.save, true);
  assert.equal(commercialPlanDefinitions[plan].capabilities.share, true);
  assert.equal(commercialPlanDefinitions[plan].capabilities.fork, true);
}

console.log("Commercial capability configuration remains extensible without prices or arbitrary limits.");
