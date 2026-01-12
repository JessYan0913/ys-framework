ALTER TABLE "Organization" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Organization" ADD CONSTRAINT "Organization_owner_id_User_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
