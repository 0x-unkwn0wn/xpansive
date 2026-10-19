ALTER TABLE "exploration_nodes" ADD COLUMN "active_suggestion_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "exploration_nodes" ADD COLUMN "suggestion_history" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "exploration_nodes" AS parent
SET "active_suggestion_ids" = COALESCE((
  SELECT jsonb_agg(child."id" ORDER BY child."created_at", child."id")
  FROM "exploration_nodes" AS child
  WHERE child."exploration_id" = parent."exploration_id"
    AND child."parent_id" = parent."id"
    AND child."branch_status" = 'active'
    AND child."status" <> 'explored'
), '[]'::jsonb);
