CREATE TABLE "transaction_return" (
	"id" uuid PRIMARY KEY NOT NULL,
	"transaction_id" uuid NOT NULL,
	"return_number" text NOT NULL,
	"store_id" uuid NOT NULL,
	"total_refund" numeric NOT NULL,
	"reason" text,
	"created_by" uuid,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"synced_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "transaction_return_item" (
	"id" uuid PRIMARY KEY NOT NULL,
	"return_id" uuid NOT NULL,
	"transaction_item_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" numeric NOT NULL,
	"refund_price" numeric NOT NULL,
	"restock" boolean DEFAULT true NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transaction_return" ADD CONSTRAINT "transaction_return_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_return_item" ADD CONSTRAINT "transaction_return_item_return_id_transaction_return_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."transaction_return"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_return_item" ADD CONSTRAINT "transaction_return_item_transaction_item_id_transaction_items_id_fk" FOREIGN KEY ("transaction_item_id") REFERENCES "public"."transaction_items"("id") ON DELETE no action ON UPDATE no action;