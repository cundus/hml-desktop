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
ALTER TABLE "store" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "store" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "store" ADD COLUMN "default_sales_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "sales_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "sales_name" text;