ALTER TABLE "transaction_items" ADD COLUMN "synced_at" timestamp;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD COLUMN "deleted_at" timestamp;