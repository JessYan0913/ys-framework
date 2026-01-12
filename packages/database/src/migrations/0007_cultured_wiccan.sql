ALTER TABLE "App" RENAME COLUMN "organization_id" TO "user_id";--> statement-breakpoint
ALTER TABLE "App" DROP CONSTRAINT "App_organization_id_Organization_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "app_org_idx";--> statement-breakpoint
ALTER TABLE "App" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "App" ADD CONSTRAINT "App_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
