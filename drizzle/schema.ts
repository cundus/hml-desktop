import { pgTable, text, numeric, timestamp, unique, boolean, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const cashierShift = pgTable("cashier_shift", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	storeId: text("store_id").notNull(),
	status: text().default('OPEN').notNull(),
	initialCash: numeric("initial_cash").default('0').notNull(),
	closingCash: numeric("closing_cash"),
	expectedCash: numeric("expected_cash"),
	difference: numeric(),
	notes: text(),
	openedAt: timestamp("opened_at", { mode: 'string' }).notNull(),
	closedAt: timestamp("closed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deviceId: text("device_id"),
});

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
	pin: text(),
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
	weight: numeric().default('0'),
	supplierId: text("supplier_id"),
	isService: boolean("is_service").default(false).notNull(),
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
	phone: text(),
	email: text(),
	defaultSalesId: text("default_sales_id"),
});

export const transactionItems = pgTable("transaction_items", {
	id: text().primaryKey().notNull(),
	transactionId: text("transaction_id").notNull(),
	productId: text("product_id").notNull(),
	quantity: integer().notNull(),
	price: numeric().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	displayQuantity: numeric("display_quantity"),
	uomCode: text("uom_code"),
	productName: text("product_name"),
	productSku: text("product_sku"),
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
	updatedAt: timestamp("updated_at", { mode: 'string' }),
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

export const productUomCategoryPrice = pgTable("product_uom_category_price", {
	id: text().primaryKey().notNull(),
	productId: text("product_id").notNull(),
	uomId: text("uom_id").notNull(),
	priceCategoryId: text("price_category_id").notNull(),
	price: numeric().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deviceId: text("device_id"),
}, (table) => [
	unique("product_uom_category_price_product_id_uom_id_price_category_id_").on(table.productId, table.uomId, table.priceCategoryId),
]);

export const priceCategory = pgTable("price_category", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isDefault: boolean("is_default").default(false).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deviceId: text("device_id"),
});

export const productUom = pgTable("product_uom", {
	id: text().primaryKey().notNull(),
	productId: text("product_id").notNull(),
	uomId: text("uom_id").notNull(),
	conversionFactor: numeric("conversion_factor").notNull(),
	isBaseUnit: boolean("is_base_unit").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deviceId: text("device_id"),
});

export const storeProductUomPrice = pgTable("store_product_uom_price", {
	id: text().primaryKey().notNull(),
	productId: text("product_id").notNull(),
	uomId: text("uom_id").notNull(),
	priceCategoryId: text("price_category_id").notNull(),
	storeId: text("store_id").notNull(),
	price: numeric().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deviceId: text("device_id"),
}, (table) => [
	unique("store_product_uom_price_product_id_uom_id_price_category_id_sto").on(table.productId, table.uomId, table.priceCategoryId, table.storeId),
]);

export const expenses = pgTable("expenses", {
	id: text().primaryKey().notNull(),
	shiftId: text("shift_id").notNull(),
	item: text().notNull(),
	quantity: integer().default(1).notNull(),
	price: numeric().notNull(),
	total: numeric().notNull(),
	description: text(),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
});

export const shiftHistory = pgTable("shift_history", {
	id: text().primaryKey().notNull(),
	shiftId: text("shift_id").notNull(),
	userId: text("user_id").notNull(),
	action: text().notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deviceId: text("device_id"),
});

export const salesPerson = pgTable("sales_person", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
});

export const deliveryOrder = pgTable("delivery_order", {
	id: text().primaryKey().notNull(),
	transactionId: text("transaction_id").notNull(),
	noSuratJalan: text("no_surat_jalan").notNull(),
	sequenceNumber: integer("sequence_number").notNull(),
	sequenceYear: integer("sequence_year").notNull(),
	tanggal: timestamp({ mode: 'string' }).notNull(),
	sales: text(),
	customerId: text("customer_id"),
	customerName: text("customer_name").notNull(),
	customerAddress: text("customer_address"),
	notes: text(),
	printedAt: timestamp("printed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("delivery_order_no_surat_jalan_unique").on(table.noSuratJalan),
]);

export const paymentMethod = pgTable("payment_method", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
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
	totalWeight: numeric("total_weight").default('0'),
	paymentMethod: text("payment_method").default('cash').notNull(),
	paymentDeadline: timestamp("payment_deadline", { mode: 'string' }),
	receiptPrinted: boolean("receipt_printed").default(false).notNull(),
	salesId: text("sales_id"),
	salesName: text("sales_name"),
}, (table) => [
	unique("transactions_code_unique").on(table.code),
]);

export const employee = pgTable("employee", {
	id: text().primaryKey().notNull(),
	employeeCode: text("employee_code").notNull(),
	userId: text("user_id"),
	name: text().notNull(),
	email: text(),
	phone: text(),
	address: text(),
	birthDate: timestamp("birth_date", { mode: 'string' }),
	gender: text(),
	maritalStatus: text("marital_status"),
	storeId: text("store_id"),
	position: text(),
	department: text(),
	employmentType: text("employment_type"),
	joinDate: timestamp("join_date", { mode: 'string' }),
	endDate: timestamp("end_date", { mode: 'string' }),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deviceId: text("device_id"),
}, (table) => [
	unique("employee_code_unique").on(table.employeeCode),
]);

export const employeeSalaryComponent = pgTable("employee_salary_component", {
	id: text().primaryKey().notNull(),
	employeeId: text("employee_id").notNull(),
	componentId: text("component_id").notNull(),
	amount: numeric().notNull(),
	effectiveDate: timestamp("effective_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deviceId: text("device_id"),
}, (table) => [
	unique("employee_salary_component_unique").on(table.employeeId, table.componentId),
]);

export const salaryComponent = pgTable("salary_component", {
	id: text().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	type: text().notNull(),
	isFixed: boolean("is_fixed").default(true).notNull(),
	defaultAmount: numeric("default_amount").default('0').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deviceId: text("device_id"),
}, (table) => [
	unique("salary_component_code_unique").on(table.code),
]);

export const employeeSchedule = pgTable("employee_schedule", {
	id: text().primaryKey().notNull(),
	employeeId: text("employee_id").notNull(),
	scheduleId: text("schedule_id").notNull(),
	effectiveDate: text("effective_date").notNull(),
	endDate: text("end_date"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deviceId: text("device_id"),
});

export const payrollPeriod = pgTable("payroll_period", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	startDate: text("start_date").notNull(),
	endDate: text("end_date").notNull(),
	cutoffDay: integer("cutoff_day").default(25),
	status: text().default('open'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deviceId: text("device_id"),
});

export const attendance = pgTable("attendance", {
	id: text().primaryKey().notNull(),
	employeeId: text("employee_id").notNull(),
	date: text().notNull(),
	clockIn: timestamp("clock_in", { mode: 'string' }),
	clockOut: timestamp("clock_out", { mode: 'string' }),
	clockInLocation: text("clock_in_location"),
	clockOutLocation: text("clock_out_location"),
	lateMinutes: integer("late_minutes").default(0),
	earlyLeaveMinutes: integer("early_leave_minutes").default(0),
	overtimeMinutes: integer("overtime_minutes").default(0),
	status: text().default('present'),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deviceId: text("device_id"),
}, (table) => [
	unique("attendance_employee_date_unique").on(table.employeeId, table.date),
]);

export const payrollSetting = pgTable("payroll_setting", {
	id: text().primaryKey().notNull(),
	cutoffDay: integer("cutoff_day").default(25),
	overtimeRate: numeric("overtime_rate").default('1.5'),
	lateDeductionPerMinute: numeric("late_deduction_per_minute").default('0'),
	minOvertimeMinutes: integer("min_overtime_minutes").default(30),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const workSchedule = pgTable("work_schedule", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	startTime: text("start_time").notNull(),
	endTime: text("end_time").notNull(),
	breakDuration: integer("break_duration").default(60),
	isDefault: boolean("is_default").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deviceId: text("device_id"),
});
