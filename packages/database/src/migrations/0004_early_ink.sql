ALTER TYPE "account_type" ADD VALUE 'app';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "App" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" varchar(255) NOT NULL,
	"app_key" varchar(255) NOT NULL,
	"organization_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"expires_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "App_app_id_unique" UNIQUE("app_id")
);
--> statement-breakpoint
ALTER TABLE "Chat" RENAME COLUMN "userId" TO "account_id";--> statement-breakpoint
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_userId_User_id_fk";
--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "account_type" "account_type" NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "App" ADD CONSTRAINT "App_organization_id_Organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."Organization"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "app_org_idx" ON "App" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_account_idx" ON "Chat" USING btree ("account_id","account_type");