ALTER TABLE "App" RENAME COLUMN "app_key_hash" TO "public_key";--> statement-breakpoint
ALTER TABLE "App" ALTER COLUMN "public_key" SET DATA TYPE varchar(512);