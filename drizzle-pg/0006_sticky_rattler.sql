CREATE TABLE "point_history" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"transaction_id" text,
	"type" text NOT NULL,
	"points" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"notes" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"synced_at" timestamp,
	"deleted_at" timestamp,
	"device_id" text
);
--> statement-breakpoint
CREATE TABLE "point_setting" (
	"id" text PRIMARY KEY NOT NULL,
	"point_per_rupiah" numeric DEFAULT '0.01' NOT NULL,
	"min_transaction" numeric DEFAULT '0' NOT NULL,
	"redemption_value" numeric DEFAULT '10' NOT NULL,
	"min_redemption" integer DEFAULT 100 NOT NULL,
	"max_redemption_percent" integer DEFAULT 50 NOT NULL,
	"expiry_months" integer DEFAULT 12 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"synced_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "product_uom" ADD COLUMN "cost" numeric;--> statement-breakpoint
ALTER TABLE "product_uom" ADD COLUMN "cost_override" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "total_points" integer DEFAULT 0 NOT NULL;