CREATE TABLE "User" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100),
	"email" varchar(64) NOT NULL,
	"password" varchar(256),
	"phone" varchar(20),
	"bio" text,
	"avatar" text,
	"favorite_style" varchar(50),
	"last_active" timestamp,
	"email_verified" boolean DEFAULT false,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"join_date" timestamp DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE UNIQUE INDEX "user_email_unique_idx" ON "User" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_user_idx" ON "UserAuthIdentity" USING btree ("provider","provider_user_id");