CREATE TABLE "UserAuthIdentity" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_user_id" text NOT NULL,
	"union_id" text,
	"open_id" text,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"raw" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "Cache" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"ttl" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "UserAuthIdentity" ADD CONSTRAINT "UserAuthIdentity_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "provider_user_idx" ON "UserAuthIdentity" USING btree ("provider","provider_user_id");--> statement-breakpoint
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "ownership_constraint" CHECK ((owner_id IS NULL) OR (organization_id IS NULL));--> statement-breakpoint
-- ALTER TABLE "Project" ADD CONSTRAINT "project_ownership_constraint" CHECK ((organization_id IS NULL));