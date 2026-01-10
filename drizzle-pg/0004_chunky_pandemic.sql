CREATE TABLE "price_category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"synced_at" timestamp,
	"deleted_at" timestamp,
	"device_id" text
);
--> statement-breakpoint
CREATE TABLE "product_uom_category_price" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"uom_id" text NOT NULL,
	"price_category_id" text NOT NULL,
	"price" numeric NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"synced_at" timestamp,
	"deleted_at" timestamp,
	"device_id" text,
	CONSTRAINT "product_uom_category_price_product_id_uom_id_price_category_id_unique" UNIQUE("product_id","uom_id","price_category_id")
);
--> statement-breakpoint
CREATE TABLE "product_uom" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"uom_id" text NOT NULL,
	"conversion_factor" numeric NOT NULL,
	"is_base_unit" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"synced_at" timestamp,
	"deleted_at" timestamp,
	"device_id" text
);
--> statement-breakpoint
CREATE TABLE "store_product_uom_price" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"uom_id" text NOT NULL,
	"price_category_id" text NOT NULL,
	"store_id" text NOT NULL,
	"price" numeric NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"synced_at" timestamp,
	"deleted_at" timestamp,
	"device_id" text,
	CONSTRAINT "store_product_uom_price_product_id_uom_id_price_category_id_store_id_unique" UNIQUE("product_id","uom_id","price_category_id","store_id")
);
--> statement-breakpoint
CREATE TABLE "cashier_shift" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"store_id" text NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"initial_cash" numeric DEFAULT '0' NOT NULL,
	"closing_cash" numeric,
	"expected_cash" numeric,
	"difference" numeric,
	"notes" text,
	"opened_at" timestamp NOT NULL,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"synced_at" timestamp,
	"deleted_at" timestamp,
	"device_id" text
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"shift_id" text NOT NULL,
	"item" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"price" numeric NOT NULL,
	"total" numeric NOT NULL,
	"description" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"synced_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "shift_history" (
	"id" text PRIMARY KEY NOT NULL,
	"shift_id" text NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"synced_at" timestamp,
	"deleted_at" timestamp,
	"device_id" text
);
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "weight" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "supplier_id" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "is_service" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_adjustment" ADD COLUMN "updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD COLUMN "display_quantity" numeric;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD COLUMN "uom_code" text;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD COLUMN "product_name" text;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD COLUMN "product_sku" text;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD COLUMN "synced_at" timestamp;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "total_weight" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "payment_method" text DEFAULT 'cash' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "payment_deadline" timestamp;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "receipt_printed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_code_unique" UNIQUE("code");