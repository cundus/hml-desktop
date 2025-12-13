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
