import { pgTable, unique, text, timestamp, numeric, boolean, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const uom = pgTable("uom", {
	id: text().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	deviceId: text("device_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	unique("uom_code_unique").on(table.code),
]);

export const auditLog = pgTable("audit_log", {
	id: text().primaryKey().notNull(),
	action: text().notNull(),
	userId: text("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deviceId: text("device_id"),
});

export const permission = pgTable("permission", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deviceId: text("device_id"),
});

export const rolePermission = pgTable("role_permission", {
	id: text().primaryKey().notNull(),
	roleId: text("role_id").notNull(),
	permissionId: text("permission_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deviceId: text("device_id"),
});

export const role = pgTable("role", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deviceId: text("device_id"),
});

export const userRole = pgTable("user_role", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	roleId: text("role_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deviceId: text("device_id"),
});

export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	password: text().notNull(),
	storeId: text("store_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deviceId: text("device_id"),
});

export const batch = pgTable("batch", {
	id: text().primaryKey().notNull(),
	productId: text("product_id").notNull(),
	code: text().notNull(),
	expiryDate: timestamp("expiry_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
});

export const category = pgTable("category", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
});

export const productPrice = pgTable("product_price", {
	id: text().primaryKey().notNull(),
	productId: text("product_id").notNull(),
	storeId: text("store_id").notNull(),
	price: numeric().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	cost: numeric().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	deviceId: text("device_id"),
});

export const product = pgTable("product", {
	id: text().primaryKey().notNull(),
	sku: text().notNull(),
	name: text().notNull(),
	description: text(),
	unit: text().notNull(),
	cost: numeric().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	categoryId: text("category_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deviceId: text("device_id"),
});

export const supplier = pgTable("supplier", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	phone: text(),
	address: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
});

export const customerCategory = pgTable("customer_category", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
});

export const store = pgTable("store", {
	id: text().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	address: text(),
	type: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
});

export const customer = pgTable("customer", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	phone: text(),
	categoryId: text("category_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	address: text(),
});

export const productLocation = pgTable("product_location", {
	id: text().primaryKey().notNull(),
	productId: text("product_id").notNull(),
	storeId: text("store_id").notNull(),
	quantity: integer().default(0).notNull(),
	reservedQuantity: integer("reserved_quantity").default(0).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deviceId: text("device_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const transactionItems = pgTable("transaction_items", {
	id: text().primaryKey().notNull(),
	transactionId: text("transaction_id").notNull(),
	productId: text("product_id").notNull(),
	quantity: integer().notNull(),
	price: numeric().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const stockAdjustment = pgTable("stock_adjustment", {
	id: text().primaryKey().notNull(),
	productId: text("product_id").notNull(),
	storeId: text("store_id").notNull(),
	difference: integer().notNull(),
	note: text(),
	performedBy: text("performed_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deviceId: text("device_id"),
});

export const transactions = pgTable("transactions", {
	id: text().primaryKey().notNull(),
	code: text().notNull(),
	storeId: text("store_id").notNull(),
	subtotal: numeric().notNull(),
	discount: numeric().default('0').notNull(),
	tax: numeric().default('0').notNull(),
	total: numeric().notNull(),
	customerId: text("customer_id"),
	userId: text("user_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deviceId: text("device_id"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const purchaseOrderItem = pgTable("purchase_order_item", {
	id: text().primaryKey().notNull(),
	poId: text("po_id").notNull(),
	productId: text("product_id").notNull(),
	quantity: integer().notNull(),
	cost: numeric().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const stockTransaction = pgTable("stock_transaction", {
	id: text().primaryKey().notNull(),
	productId: text("product_id").notNull(),
	storeId: text("store_id").notNull(),
	type: text().notNull(),
	quantity: integer().notNull(),
	reference: text(),
	batchId: text("batch_id"),
	supplierId: text("supplier_id"),
	customerId: text("customer_id"),
	performedBy: text("performed_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deviceId: text("device_id"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const purchaseOrder = pgTable("purchase_order", {
	id: text().primaryKey().notNull(),
	code: text().notNull(),
	supplierId: text("supplier_id").notNull(),
	storeId: text("store_id").notNull(),
	status: text().notNull(),
	total: numeric().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
});

export const transferItem = pgTable("transfer_item", {
	id: text().primaryKey().notNull(),
	transferId: text("transfer_id").notNull(),
	productId: text("product_id").notNull(),
	quantity: integer().notNull(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
});

export const transferRequest = pgTable("transfer_request", {
	id: text().primaryKey().notNull(),
	sourceId: text("source_id").notNull(),
	destinationId: text("destination_id").notNull(),
	reference: text().notNull(),
	note: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deviceId: text("device_id"),
});
