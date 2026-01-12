DO $$ BEGIN
 CREATE TYPE "public"."user_type" AS ENUM('individual', 'enterprise');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "UserSurvey" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"user_type" "user_type" NOT NULL,
	"company_name" varchar(255),
	"industry" varchar(255),
	"role" varchar(255),
	"requirements" text,
	"expected_features" jsonb DEFAULT '[]'::jsonb,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserSurvey" ADD CONSTRAINT "UserSurvey_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_survey_user_unique_idx" ON "UserSurvey" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_survey_completed_idx" ON "UserSurvey" USING btree ("is_completed");