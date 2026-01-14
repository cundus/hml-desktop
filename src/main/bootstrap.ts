import {
  AuthController,
  BatchController,
  CategoryController,
  CustomerCategoryController,
  CustomerController,
  ExpenseController,
  PermissionController,
  ProductController,
  ProductLocationController,
  ProductPriceController,
  PurchaseOrderController,
  RoleController,
  RolePermissionController,
  StockTransactionController,
  StoreController,
  SupplierController,
  TransactionController,
  UomController,
  UserController,
  UserRoleController,
  PricingController
} from './controllers'
import { registerInventoryHandlers } from './controllers/inventory.controller'
import { registerAppConfigHandlers } from './controllers/app-config.controller'
import { registerShiftHandlers } from './controllers/shift.controller'
import { ReceiptController } from './controllers/receipt.controller'
import { registerPrinterConfigController } from './controllers/printer-config.controller'
import { registerDeliveryOrderController } from './controllers/delivery-order.controller'
import { getDb } from './db'
import {
  seedAdmin,
  seedUoms,
  seedPriceCategories,
  backfillProductUomsAndStorePrices,
  seedPermissions,
  resetAndReseedPermissions
} from './seed'
import {
  PurchaseOrderService,
  ReceiptService,
  TransactionService,
  PricingService
} from './services'
import { AppConfigService } from './services/app-config.service'
import { ShiftService } from './services/shift.service'
import { PriceCategoryController } from './controllers/price-category.controller'
import { PrinterConfigService } from './services/printer-config.service'
import { PaymentMethodService } from './services/payment-method.service'
import { PaymentMethodController } from './controllers/payment-method.controller'
import { SalesPersonService } from './services/sales-person.service'
import { QueueService } from './services/queue.service'
import { getCloudDb } from './services/cloud-db.service'
import { getConnectivity } from './services/connectivity.service'
import { QueueProcessorService } from './services/queue-processor.service'
import { CategoryCloudService } from './services/category-cloud.service'
import { CustomerCloudService } from './services/customer-cloud.service'
import { StoreCloudService } from './services/store-cloud.service'
import { SupplierCloudService } from './services/supplier-cloud.service'
import { UserCloudService } from './services/user-cloud.service'
import { AuthCloudService } from './services/auth-cloud.service'
import { UomCloudService } from './services/uom-cloud.service'
import { CustomerCategoryCloudService } from './services/customer-category-cloud.service'
import { RoleCloudService } from './services/role-cloud.service'
import { PermissionCloudService } from './services/permission-cloud.service'
import { BatchCloudService } from './services/batch-cloud.service'
import { UserRoleCloudService } from './services/user-role-cloud.service'
import { RolePermissionCloudService } from './services/role-permission-cloud.service'
import { ExpenseCloudService } from './services/expense-cloud.service'
import { ProductPriceCloudService } from './services/product-price-cloud.service'
import { ProductLocationCloudService } from './services/product-location-cloud.service'
import { StockTransactionCloudService } from './services/stock-transaction-cloud.service'
import { PriceCategoryCloudService } from './services/price-category-cloud.service'
import { SalesPersonController } from './controllers/sales-person.controller'
import { ProductCloudService } from './services/product-cloud.service'
import { QueueController } from './controllers/queue.controller'
import { CloudController } from './controllers/cloud.controller'

/**
 * Bootstrap the application by initializing services and controllers
 */
export async function bootstrap(): Promise<void> {
  // Get sql.js database instance (async)
  const db = await getDb()

  // Seed static reference data
  await resetAndReseedPermissions(db) // TEMPORARY: Use reset to fix duplicates
  await seedPermissions(db)
  await seedAdmin(db)
  await seedUoms(db)
  await seedPriceCategories(db)
  await backfillProductUomsAndStorePrices(db)

  // Initialize cloud-first infrastructure
  const queueService = new QueueService(db)
  const queueProcessor = new QueueProcessorService(queueService)
  
  // Start queue processor (background worker)
  queueProcessor.start()
  console.log('[Bootstrap] Queue processor started')

  // Initialize master data services (cloud-first where available)
  const categoryService = new CategoryCloudService(db, queueService)
  const supplierService = new SupplierCloudService(db, queueService)
  const storeService = new StoreCloudService(db, queueService)
  const customerCategoryService = new CustomerCategoryCloudService(db, queueService)
  const customerService = new CustomerCloudService(db, queueService)
  const uomService = new UomCloudService(db, queueService)

  // Initialize core entity services
  const userService = new UserCloudService(db, queueService)
  const productService = new ProductCloudService(db, queueService)
  const roleService = new RoleCloudService(db, queueService)
  const userRoleService = new UserRoleCloudService(db, queueService)
  const permissionService = new PermissionCloudService(db)
  const rolePermissionService = new RolePermissionCloudService(db, queueService)
  const authService = new AuthCloudService(db)

  // Initialize inventory services
  const productPriceService = new ProductPriceCloudService(db, queueService)
  const productLocationService = new ProductLocationCloudService(db, queueService)
  const batchService = new BatchCloudService(db, queueService)
  const stockTransactionService = new StockTransactionCloudService(db, queueService)
  const pricingService = new PricingService(db)
  const priceCategoryService = new PriceCategoryCloudService(db, queueService)

  // Initialize sales/POS service (with inventory integration for INV-001)
  const transactionService = new TransactionService(
    db,
    stockTransactionService,
    productLocationService,
    queueService
  )

  // Initialize purchasing service
  // Initialize purchasing service
  const purchaseOrderService = new PurchaseOrderService(
    db
    // stockTransactionService,
    // productLocationService
  )

  // Initialize expense service
  const expenseService = new ExpenseCloudService(db, queueService)

  // Initialize shift service
  const shiftService = new ShiftService(db, expenseService)

  // Initialize app config service
  const appConfigService = new AppConfigService(db)

  // Initialize printer config service (uses local JSON file, not database)
  const printerConfigService = new PrinterConfigService()

  // Initialize receipt service with printer config and store service
  const receiptService = new ReceiptService(appConfigService, productService, printerConfigService, storeService)

  // Initialize delivery order service
  const { DeliveryOrderService } = await import('./services/delivery-order.service')
  const deliveryOrderService = new DeliveryOrderService(db)

  // Initialize payment method service
  const paymentMethodService = new PaymentMethodService(db)

  // Initialize sales person service
  const salesPersonService = new SalesPersonService(db)

  // Auto-connect to cloud if PG_DATABASE_URL or DATABASE_URL is set
  const pgUrl = process.env.PG_DATABASE_URL || process.env.DATABASE_URL
  if (pgUrl) {
    try {
      // Initialize cloud DB connection (new cloud-first system)
      await getCloudDb().connect(pgUrl)
      console.log('✓ CloudDb connected')

      // Start connectivity monitoring and queue processor
      getConnectivity().startMonitoring()
      queueProcessor.start()
      console.log('✓ Cloud connected')
    } catch (error) {
      console.warn('⚠ Cloud auto-connect failed:', error instanceof Error ? error.message : error)
      console.log('  App will run in offline mode. You can connect manually later.')
    }
  }

  // Store service references for app state (used by close guard)
  const { setAppServices } = await import('./appState')
  setAppServices(shiftService, queueService)


  // Initialize controllers
  const categoryController = new CategoryController(categoryService)
  const supplierController = new SupplierController(supplierService)
  const storeController = new StoreController(storeService)
  const customerCategoryController = new CustomerCategoryController(customerCategoryService)
  const customerController = new CustomerController(customerService)
  const userController = new UserController(userService)
  const productController = new ProductController(productService)
  const productPriceController = new ProductPriceController(productPriceService)
  const productLocationController = new ProductLocationController(productLocationService)
  const batchController = new BatchController(batchService)
  const stockTransactionController = new StockTransactionController(stockTransactionService)
  const transactionController = new TransactionController(transactionService)
  const purchaseOrderController = new PurchaseOrderController(purchaseOrderService)
  const roleController = new RoleController(roleService)
  const userRoleController = new UserRoleController(userRoleService)
  const permissionController = new PermissionController(permissionService)
  const rolePermissionController = new RolePermissionController(rolePermissionService)
  const authController = new AuthController(authService)
  const uomController = new UomController(uomService)
  const receiptController = new ReceiptController(receiptService)
  const expenseController = new ExpenseController(expenseService)
  const pricingController = new PricingController(pricingService)
  const priceCategoryController = new PriceCategoryController(priceCategoryService)
  new PaymentMethodController(paymentMethodService)
  const salesPersonController = new SalesPersonController(salesPersonService)

  // Register IPC handlers
  categoryController.registerHandlers()
  supplierController.registerHandlers()
  storeController.registerHandlers()
  customerCategoryController.registerHandlers()
  customerController.registerHandlers()
  userController.registerHandlers()
  productController.registerHandlers()
  productPriceController.registerHandlers()
  pricingController.registerHandlers()
  priceCategoryController.registerHandlers()
  productLocationController.registerHandlers()
  batchController.registerHandlers()
  stockTransactionController.registerHandlers()
  transactionController.registerHandlers()
  purchaseOrderController.registerHandlers()
  roleController.registerHandlers()
  userRoleController.registerHandlers()
  permissionController.registerHandlers()
  rolePermissionController.registerHandlers()
  authController.registerHandlers()
  uomController.registerHandlers()
  receiptController.registerHandlers()
  expenseController.registerHandlers()
  registerShiftHandlers(shiftService)
  registerAppConfigHandlers(appConfigService)
  registerPrinterConfigController(printerConfigService)
  registerDeliveryOrderController(deliveryOrderService)
  salesPersonController.registerHandlers()

  // Register queue controller
  const queueController = new QueueController(queueService, queueProcessor)
  queueController.registerHandlers()
  
  // Register cloud controller (handles sync:* IPC)
  const cloudController = new CloudController(queueProcessor)
  cloudController.registerHandlers()
  
  registerInventoryHandlers()

  console.log('✓ All 25 services and controllers initialized (sql.js local + cloud sync ready)')
}
