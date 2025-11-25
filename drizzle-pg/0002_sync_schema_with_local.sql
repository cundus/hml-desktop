ALTER TABLE "customer" ALTER COLUMN "category_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "product_location" ALTER COLUMN "quantity" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "product_location" ALTER COLUMN "reserved_quantity" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "stock_transaction" ALTER COLUMN "performed_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "discount" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "tax" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "product_price" ADD COLUMN "cost" numeric NOT NULL;--> statement-breakpoint
ALTER TABLE "product_price" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "product_price" ADD COLUMN "device_id" text;--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "product_location" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_transaction" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD COLUMN "price" numeric NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_order_item" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_order_item" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "product_price" DROP COLUMN "start_date";--> statement-breakpoint
ALTER TABLE "product_price" DROP COLUMN "end_date";--> statement-breakpoint
ALTER TABLE "product_location" DROP COLUMN "location";--> statement-breakpoint
ALTER TABLE "transaction_items" DROP COLUMN "customer_id";--> statement-breakpoint
ALTER TABLE "transaction_items" DROP COLUMN "deleted_at";--> statement-breakpoint
ALTER TABLE "purchase_order_item" DROP COLUMN "deleted_at";