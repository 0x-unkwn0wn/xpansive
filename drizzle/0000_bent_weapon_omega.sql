CREATE TABLE "explorations" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"slug" varchar(16) NOT NULL,
	"initial_idea" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "explorations_slug_unique" UNIQUE("slug")
);
