CREATE TABLE "open_bill_item" (
	"id" text PRIMARY KEY NOT NULL,
	"open_bill_id" text NOT NULL,
	"product_id" text NOT NULL,
	"cart_item_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"display_quantity" numeric,
	"uom_code" text,
	"uom_id" text,
	"price_category_id" text,
	"price_category_name" text,
	"conversion_factor" numeric DEFAULT '1' NOT NULL,
	"base_quantity" numeric NOT NULL,
	"product_name" text,
	"product_sku" text,
	"unit_price" numeric NOT NULL,
	"weight" numeric DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "open_bill" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text,
	"store_id" text NOT NULL,
	"shift_id" text NOT NULL,
	"customer_id" text,
	"sales_id" text,
	"sales_name" text,
	"subtotal" numeric DEFAULT '0' NOT NULL,
	"discount" numeric DEFAULT '0' NOT NULL,
	"total" numeric DEFAULT '0' NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
