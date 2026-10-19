ALTER TABLE "explorations" ADD COLUMN "conclusion_node_id" varchar(80);
ALTER TABLE "explorations" ADD COLUMN "resolution_status" varchar(16) DEFAULT 'active' NOT NULL;
ALTER TABLE "explorations" ADD COLUMN "resolved_at" timestamp with time zone;
ALTER TABLE "explorations" ADD COLUMN "synthesis" jsonb;
ALTER TABLE "explorations" ADD COLUMN "synthesis_source_revision" integer;
ALTER TABLE "explorations" ADD COLUMN "synthesis_created_at" timestamp with time zone;
ALTER TABLE "explorations" ADD COLUMN "synthesis_stale" boolean DEFAULT false NOT NULL;
