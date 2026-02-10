CREATE TABLE "damaged_goods" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"store_id" text NOT NULL,
	"uom_id" text NOT NULL,
	"quantity" double precision NOT NULL,
	"cost" text DEFAULT '0' NOT NULL,
	"total_loss" text DEFAULT '0' NOT NULL,
	"reason" text NOT NULL,
	"notes" text,
	"performed_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"synced_at" timestamp,
	"deleted_at" timestamp,
	"device_id" text
);
--> statement-breakpoint
CREATE TABLE "expense_category" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'operational' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"synced_at" timestamp,
	"deleted_at" timestamp,
	"device_id" text,
	CONSTRAINT "expense_category_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "shift_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "entity_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "entity_id" text;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "user_name" text;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "store_id" text;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "store_name" text;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "old_values" text;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "new_values" text;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "metadata" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "category_id" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "store_id" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "device_id" text;--> statement-breakpoint
ALTER TABLE "transaction_return_item" ADD COLUMN "product_name" text;--> statement-breakpoint
ALTER TABLE "transaction_return_item" ADD COLUMN "uom_code" text DEFAULT 'PCS' NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction_return_item" ADD COLUMN "display_quantity" numeric;--> statement-breakpoint
ALTER TABLE "transaction_return_item" ADD COLUMN "conversion_factor" numeric DEFAULT '1' NOT NULL;