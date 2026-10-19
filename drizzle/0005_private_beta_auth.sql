ALTER TABLE "newsletter_subscribers" RENAME TO "waitlist_entries";
ALTER TABLE "waitlist_entries" ADD COLUMN "use_case" text;
ALTER TABLE "waitlist_entries" ADD COLUMN "status" varchar(16) DEFAULT 'pending' NOT NULL;
ALTER TABLE "waitlist_entries" ADD COLUMN "requested_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "waitlist_entries" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
DELETE FROM "waitlist_entries" older USING "waitlist_entries" newer WHERE lower(trim(older."email")) = lower(trim(newer."email")) AND older.ctid > newer.ctid;
UPDATE "waitlist_entries" SET "email" = lower(trim("email"));
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_status_check" CHECK ("status" IN ('pending', 'invited', 'joined', 'declined'));

CREATE TABLE "users" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");

CREATE TABLE "auth_sessions" (
	"token_hash" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions" USING btree ("user_id");

CREATE TABLE "auth_magic_links" (
	"token_hash" varchar(64) PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"invitation_id" varchar(32),
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "auth_magic_links_email_idx" ON "auth_magic_links" USING btree ("email");

CREATE TABLE "invitations" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "invitations_token_unique" ON "invitations" USING btree ("token_hash");
CREATE INDEX "invitations_email_idx" ON "invitations" USING btree ("email");

CREATE TABLE "beta_access" (
	"user_id" varchar(64) PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"invited_at" timestamp with time zone,
	"activated_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beta_access_status_check" CHECK ("status" IN ('pending', 'active', 'revoked'))
);

CREATE TABLE "commercial_plans" (
	"user_id" varchar(64) PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"plan" varchar(32) DEFAULT 'beta' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "explorations" ADD CONSTRAINT "explorations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;
CREATE INDEX "explorations_user_id_idx" ON "explorations" USING btree ("user_id");
