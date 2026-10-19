CREATE TABLE "exploration_nodes" (
	"exploration_id" varchar(32) NOT NULL,
	"id" varchar(80) NOT NULL,
	"parent_id" varchar(80),
	"title" varchar(280) NOT NULL,
	"description" varchar(240) DEFAULT '' NOT NULL,
	"status" varchar(16) NOT NULL,
	"active_child_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rejected_options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"alternative_generation_count" integer DEFAULT 0 NOT NULL,
	"alternative_batches" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error" varchar(300),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exploration_nodes_exploration_id_id_pk" PRIMARY KEY("exploration_id","id")
);
--> statement-breakpoint
ALTER TABLE "explorations" ALTER COLUMN "slug" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "explorations" ALTER COLUMN "snapshot" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "explorations" ADD COLUMN "language" varchar(8) DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE "explorations" ADD COLUMN "root_node_id" varchar(80);--> statement-breakpoint
ALTER TABLE "explorations" ADD COLUMN "current_node_id" varchar(80);--> statement-breakpoint
ALTER TABLE "explorations" ADD COLUMN "share_id" varchar(32);--> statement-breakpoint
ALTER TABLE "explorations" ADD COLUMN "edit_token_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "explorations" ADD COLUMN "is_shared" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "explorations" ADD COLUMN "journey_summary" jsonb;--> statement-breakpoint
ALTER TABLE "explorations" ADD COLUMN "journey_summary_path_key" text;--> statement-breakpoint
ALTER TABLE "explorations" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "explorations" ADD COLUMN "user_id" varchar(64);--> statement-breakpoint
ALTER TABLE "explorations" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "explorations"
SET "is_shared" = true,
    "share_id" = "slug",
    "root_node_id" = COALESCE("snapshot" ->> 'rootNodeId', 'root'),
    "current_node_id" = "snapshot" ->> 'activeNodeId',
    "language" = COALESCE("snapshot" ->> 'language', 'auto');--> statement-breakpoint
ALTER TABLE "explorations" ADD CONSTRAINT "explorations_share_id_unique" UNIQUE("share_id");
