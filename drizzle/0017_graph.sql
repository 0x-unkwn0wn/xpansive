CREATE TABLE "exploration_node_edges" (
	"exploration_id" varchar(32) NOT NULL,
	"parent_node_id" varchar(80) NOT NULL,
	"child_node_id" varchar(80) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exploration_node_edges_exploration_id_parent_node_id_child_node_id_pk" PRIMARY KEY("exploration_id","parent_node_id","child_node_id")
);
--> statement-breakpoint
ALTER TABLE "exploration_node_edges" ADD CONSTRAINT "exploration_node_edges_exploration_id_explorations_id_fk" FOREIGN KEY ("exploration_id") REFERENCES "public"."explorations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exploration_node_edges_child_idx" ON "exploration_node_edges" USING btree ("exploration_id","child_node_id");
--> statement-breakpoint
INSERT INTO "exploration_node_edges" ("exploration_id", "parent_node_id", "child_node_id")
SELECT "exploration_id", "parent_id", "id" FROM "exploration_nodes"
WHERE "parent_id" IS NOT NULL
ON CONFLICT DO NOTHING;
