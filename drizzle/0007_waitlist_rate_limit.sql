CREATE TABLE "waitlist_rate_limits" (
	"key" varchar(128) PRIMARY KEY NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "waitlist_entries" RENAME COLUMN "consent_given" TO "invitation_consent_given";--> statement-breakpoint
ALTER TABLE "waitlist_entries" RENAME COLUMN "consented_at" TO "invitation_consented_at";--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD COLUMN "marketing_consent_given" boolean DEFAULT false NOT NULL;