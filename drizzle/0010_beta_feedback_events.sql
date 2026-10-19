CREATE TABLE "feedback_submissions" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_events" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"event_name" varchar(64) NOT NULL,
	"dedupe_key" varchar(128),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD CONSTRAINT "feedback_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_events" ADD CONSTRAINT "product_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_submissions_created_idx" ON "feedback_submissions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "product_events_name_idx" ON "product_events" USING btree ("event_name");--> statement-breakpoint
CREATE INDEX "product_events_user_name_idx" ON "product_events" USING btree ("user_id","event_name");--> statement-breakpoint
CREATE UNIQUE INDEX "product_events_dedupe_unique" ON "product_events" USING btree ("user_id","event_name","dedupe_key");