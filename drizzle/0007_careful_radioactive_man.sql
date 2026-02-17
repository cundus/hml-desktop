ALTER TABLE "purchase_order_item" ADD COLUMN "unit" text DEFAULT 'PCS' NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction_return_item" ADD COLUMN "product_name" text;--> statement-breakpoint
ALTER TABLE "transaction_return_item" ADD COLUMN "uom_code" text DEFAULT 'PCS' NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction_return_item" ADD COLUMN "display_quantity" numeric;--> statement-breakpoint
ALTER TABLE "transaction_return_item" ADD COLUMN "conversion_factor" numeric DEFAULT '1' NOT NULL;