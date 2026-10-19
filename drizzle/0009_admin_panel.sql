CREATE TABLE "admin_audit_log" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"actor_user_id" varchar(64),
	"action" varchar(64) NOT NULL,
	"target_email" varchar(320),
	"target_user_id" varchar(64),
	"target_invitation_id" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "invited_by_user_id" varchar(64);--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "revoked_by_user_id" varchar(64);--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "provider_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "provider_message_id" varchar(128);--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "delivery_status" varchar(24) DEFAULT 'not_sent' NOT NULL;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "provider_error" varchar(120);--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "delivery_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" varchar(16) DEFAULT 'user' NOT NULL;--> statement-breakpoint
UPDATE "invitations" SET "provider_accepted_at" = "sent_at", "delivery_status" = 'accepted', "delivery_updated_at" = "sent_at" WHERE "sent_at" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_target_invitation_id_invitations_id_fk" FOREIGN KEY ("target_invitation_id") REFERENCES "public"."invitations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_actor_idx" ON "admin_audit_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "admin_audit_target_email_idx" ON "admin_audit_log" USING btree ("target_email");--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_revoked_by_user_id_users_id_fk" FOREIGN KEY ("revoked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
