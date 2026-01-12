DROP INDEX IF EXISTS "chat_account_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "account_subscription_unique_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_account_idx" ON "Chat" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "account_subscription_unique_idx" ON "Subscription" USING btree ("account_id");--> statement-breakpoint
ALTER TABLE "Chat" DROP COLUMN IF EXISTS "account_type";--> statement-breakpoint
ALTER TABLE "Subscription" DROP COLUMN IF EXISTS "account_type";