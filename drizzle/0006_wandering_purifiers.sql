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
ALTER TABLE "expenses" ADD COLUMN "category_id" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "store_id" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "device_id" text;