ALTER TABLE "product" ADD COLUMN "weight" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "supplier_id" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "is_service" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "total_weight" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "payment_method" text DEFAULT 'cash' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "payment_deadline" timestamp;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "receipt_printed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_code_unique" UNIQUE("code");