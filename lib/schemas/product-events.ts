import { z } from "zod";

export const ExplorationEventRequestSchema = z.object({
  eventName: z.enum(["branch_selected", "branch_discarded", "branch_favorited", "exploration_goal_set", "constraint_added", "steer_submitted", "steer_applied", "branch_generated", "manual_branch_added", "compare_completed", "merge_completed", "conclusion_marked", "conclusion_changed", "conclusion_removed", "exploration_resolved", "exploration_reopened"]),
  operationId: z.string().regex(/^[A-Za-z0-9_-]{16,128}$/),
});
