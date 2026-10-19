ALTER TABLE "explorations" ADD COLUMN "goal" varchar(500);
ALTER TABLE "explorations" ADD COLUMN "constraints" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "explorations" ADD COLUMN "summary" text;
ALTER TABLE "exploration_nodes" ADD COLUMN "state" varchar(16) DEFAULT 'active' NOT NULL;
ALTER TABLE "exploration_nodes" ADD COLUMN "origin" varchar(16) DEFAULT 'ai' NOT NULL;
ALTER TABLE "exploration_nodes" ADD COLUMN "generation_id" varchar(120);
CREATE TABLE "exploration_generations" (
  "id" varchar(120) PRIMARY KEY NOT NULL,
  "exploration_id" varchar(32) NOT NULL REFERENCES "explorations"("id") ON DELETE CASCADE,
  "node_id" varchar(80) NOT NULL,
  "steer" varchar(100),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "exploration_generations_node_idx" ON "exploration_generations" USING btree ("exploration_id", "node_id");
UPDATE "exploration_nodes" SET "state" = CASE WHEN "branch_status" = 'discarded' THEN 'discarded' ELSE 'active' END;
UPDATE "exploration_nodes" SET "origin" = 'ai' WHERE "origin" IS NULL;
INSERT INTO "exploration_generations" ("id", "exploration_id", "node_id")
SELECT 'legacy:' || "exploration_id" || ':' || "parent_id", "exploration_id", "parent_id"
FROM "exploration_nodes"
WHERE "parent_id" IS NOT NULL
GROUP BY "exploration_id", "parent_id"
ON CONFLICT ("id") DO NOTHING;
UPDATE "exploration_nodes" AS child
SET "generation_id" = 'legacy:' || child."exploration_id" || ':' || child."parent_id"
WHERE child."parent_id" IS NOT NULL;
