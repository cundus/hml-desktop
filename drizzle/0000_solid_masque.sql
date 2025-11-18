CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`synced_at` integer,
	`deleted_at` integer,
	`device_id` text
);
--> statement-breakpoint
CREATE TABLE `permission` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`synced_at` integer,
	`deleted_at` integer,
	`device_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `permission_name_unique` ON `permission` (`name`);--> statement-breakpoint
CREATE TABLE `role_permission` (
	`id` text PRIMARY KEY NOT NULL,
	`role_id` text NOT NULL,
	`permission_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`synced_at` integer,
	`deleted_at` integer,
	`device_id` text
);
--> statement-breakpoint
CREATE TABLE `role` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`synced_at` integer,
	`deleted_at` integer,
	`device_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `role_name_unique` ON `role` (`name`);--> statement-breakpoint
CREATE TABLE `user_role` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`role_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`synced_at` integer,
	`deleted_at` integer,
	`device_id` text
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`store_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`synced_at` integer,
	`deleted_at` integer,
	`device_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `batch` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`code` text NOT NULL,
	`expiry_date` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`synced_at` integer,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `category` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`synced_at` integer,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `product_price` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`store_id` text NOT NULL,
	`price` real NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`synced_at` integer,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `product` (
	`id` text PRIMARY KEY NOT NULL,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`unit` text NOT NULL,
	`cost` real NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`category_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`synced_at` integer,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_sku_unique` ON `product` (`sku`);--> statement-breakpoint
CREATE TABLE `supplier` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`address` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`synced_at` integer,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `customer_category` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`synced_at` integer,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `customer` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`category_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`synced_at` integer,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `store` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`type` text DEFAULT 'RETAIL' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`synced_at` integer,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `store_code_unique` ON `store` (`code`);--> statement-breakpoint
CREATE TABLE `product_location` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`store_id` text NOT NULL,
	`location` text,
	`quantity` integer DEFAULT 0 NOT NULL,
	`reserved_quantity` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	`synced_at` integer,
	`deleted_at` integer,
	`device_id` text
);
--> statement-breakpoint
CREATE TABLE `stock_adjustment` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`store_id` text NOT NULL,
	`difference` integer NOT NULL,
	`note` text,
	`performed_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`synced_at` integer,
	`deleted_at` integer,
	`device_id` text
);
--> statement-breakpoint
CREATE TABLE `stock_transaction` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`store_id` text NOT NULL,
	`type` text NOT NULL,
	`quantity` integer NOT NULL,
	`reference` text,
	`batch_id` text,
	`supplier_id` text,
	`customer_id` text,
	`performed_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`synced_at` integer,
	`deleted_at` integer,
	`device_id` text
);
--> statement-breakpoint
CREATE TABLE `transaction_items` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`customer_id` text,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`store_id` text NOT NULL,
	`subtotal` real NOT NULL,
	`discount` real NOT NULL,
	`tax` real NOT NULL,
	`total` real NOT NULL,
	`customer_id` text,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`synced_at` integer,
	`deleted_at` integer,
	`device_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_code_unique` ON `transactions` (`code`);--> statement-breakpoint
CREATE TABLE `purchase_order_item` (
	`id` text PRIMARY KEY NOT NULL,
	`po_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`cost` real NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `purchase_order` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`supplier_id` text NOT NULL,
	`store_id` text NOT NULL,
	`status` text NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`synced_at` integer,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_order_code_unique` ON `purchase_order` (`code`);--> statement-breakpoint
CREATE TABLE `transfer_item` (
	`id` text PRIMARY KEY NOT NULL,
	`transfer_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `transfer_request` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`destination_id` text NOT NULL,
	`reference` text NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	`synced_at` integer,
	`deleted_at` integer,
	`device_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transfer_request_reference_unique` ON `transfer_request` (`reference`);