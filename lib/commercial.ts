import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { commercialPlans } from "@/lib/db/schema";

export type CommercialPlan = "beta" | "free" | "pro" | "team";
export type CommercialCapability = "explore" | "save" | "share" | "fork";

const allCurrentCapabilities: Record<CommercialCapability, boolean> = { explore: true, save: true, share: true, fork: true };

export const commercialPlanDefinitions: Record<CommercialPlan, { capabilities: Record<CommercialCapability, boolean>; limits: Record<string, number | null> }> = {
  beta: { capabilities: allCurrentCapabilities, limits: {} },
  free: { capabilities: allCurrentCapabilities, limits: {} },
  pro: { capabilities: allCurrentCapabilities, limits: {} },
  team: { capabilities: allCurrentCapabilities, limits: {} },
};

export async function getCommercialPlan(userId: string): Promise<CommercialPlan | null> {
  const row = (await getDb().select({ plan: commercialPlans.plan }).from(commercialPlans).where(eq(commercialPlans.userId, userId)).limit(1))[0];
  return row && row.plan in commercialPlanDefinitions ? row.plan as CommercialPlan : null;
}

export async function hasCommercialCapability(userId: string, capability: CommercialCapability) {
  const plan = await getCommercialPlan(userId);
  return plan ? commercialPlanDefinitions[plan].capabilities[capability] : false;
}
