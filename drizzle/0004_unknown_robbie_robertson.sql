CREATE TABLE "newsletter_subscribers" (
	"email" varchar(320) PRIMARY KEY NOT NULL,
	"consent_given" boolean DEFAULT true NOT NULL,
	"consented_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
