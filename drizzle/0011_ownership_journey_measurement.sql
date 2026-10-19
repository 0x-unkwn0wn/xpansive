ALTER TABLE "product_events" ADD COLUMN "subject_key" varchar(64);--> statement-breakpoint
ALTER TABLE "product_events" ADD COLUMN "outcome" varchar(24);--> statement-breakpoint
ALTER TABLE "product_events" ADD COLUMN "actor_type" varchar(16);--> statement-breakpoint
ALTER TABLE "product_events" ADD COLUMN "properties" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "exploration_nodes" ADD CONSTRAINT "exploration_nodes_exploration_id_explorations_id_fk" FOREIGN KEY ("exploration_id") REFERENCES "public"."explorations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_events_subject_idx" ON "product_events" USING btree ("subject_key","occurred_at");