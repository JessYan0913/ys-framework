ALTER TABLE "Project" DROP CONSTRAINT "Project_owner_id_User_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "project_owner_idx";--> statement-breakpoint
ALTER TABLE "Project" ADD COLUMN "desc" varchar(255);--> statement-breakpoint
ALTER TABLE "Project" DROP COLUMN IF EXISTS "owner_id";