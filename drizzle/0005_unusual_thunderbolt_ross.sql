CREATE TABLE "sales_person" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"synced_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
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
CREATE TABLE "delivery_order" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL,
	"no_surat_jalan" text NOT NULL,
	"sequence_number" integer NOT NULL,
	"sequence_year" integer NOT NULL,
	"tanggal" timestamp NOT NULL,
	"sales" text,
	"customer_id" text,
	"customer_name" text NOT NULL,
	"customer_address" text,
	"notes" text,
	"printed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_order_no_surat_jalan_unique" UNIQUE("no_surat_jalan")
);
--> statement-breakpoint
CREATE TABLE "payment_method" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
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
CREATE TABLE "transaction_return" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL,
	"return_number" text NOT NULL,
	"store_id" text NOT NULL,
	"total_refund" numeric NOT NULL,
	"reason" text,
	"created_by" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"synced_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "transaction_return_item" (
	"id" text PRIMARY KEY NOT NULL,
	"return_id" text NOT NULL,
	"transaction_item_id" text NOT NULL,
	"product_id" text NOT NULL,
	"quantity" numeric NOT NULL,
	"refund_price" numeric NOT NULL,
	"restock" boolean DEFAULT true NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"synced_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
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
ALTER TABLE "audit_log" ADD COLUMN "entity_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "entity_id" text;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "user_name" text;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "store_id" text;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "store_name" text;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "old_values" text;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "new_values" text;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "metadata" text;--> statement-breakpoint
ALTER TABLE "batch" ADD COLUMN "cost" numeric DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_uom" ADD COLUMN "cost" numeric;--> statement-breakpoint
ALTER TABLE "product_uom" ADD COLUMN "cost_override" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "total_points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "store" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "store" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "store" ADD COLUMN "default_sales_id" text;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD COLUMN "display_quantity" numeric;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD COLUMN "uom_code" text;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD COLUMN "product_name" text;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD COLUMN "product_sku" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "sales_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "sales_name" text;--> statement-breakpoint
ALTER TABLE "transaction_return" ADD CONSTRAINT "transaction_return_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_return_item" ADD CONSTRAINT "transaction_return_item_return_id_transaction_return_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."transaction_return"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_return_item" ADD CONSTRAINT "transaction_return_item_transaction_item_id_transaction_items_id_fk" FOREIGN KEY ("transaction_item_id") REFERENCES "public"."transaction_items"("id") ON DELETE no action ON UPDATE no action;