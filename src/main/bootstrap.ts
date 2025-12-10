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
  SyncController,
  TransactionController,
  UomController,
  UserController,
  UserRoleController,
  PricingController
} from './controllers'
import { registerAppConfigHandlers } from './controllers/app-config.controller'
import { registerShiftHandlers } from './controllers/shift.controller'
import { ReceiptController } from './controllers/receipt.controller'
import { getDb } from './db'
import {
  seedAdmin,
  seedUoms,
  seedPriceCategories,
  backfillProductUomsAndStorePrices,
  seedPermissions
} from './seed'
import {
  AuthService,
  BatchService,
  CategoryService,
  CustomerCategoryService,
  CustomerService,
  ExpenseService,
  PermissionService,
  ProductLocationService,
  ProductPriceService,
  ProductService,
  PurchaseOrderService,
  ReceiptService,
  RolePermissionService,
  RoleService,
  StockTransactionService,
  StoreService,
  SupplierService,
  SyncService,
  TransactionService,
  UomService,
  UserService,
  UserRoleService,
  PricingService
} from './services'
import { AppConfigService } from './services/app-config.service'
import { ShiftService } from './services/shift.service'
import { PriceCategoryService } from './services/price-category.service'
import { PriceCategoryController } from './controllers/price-category.controller'

/**
 * Bootstrap the application by initializing services and controllers
 */
export async function bootstrap(): Promise<void> {
  // Get sql.js database instance (async)
  const db = await getDb()

  // Seed static reference data
  // await resetAndReseedPermissions(db) // TEMPORARY: Use reset to fix duplicates
  await seedPermissions(db)
  await seedAdmin(db)
  await seedUoms(db)
  await seedPriceCategories(db)
  await backfillProductUomsAndStorePrices(db)

  // Initialize master data services
  const categoryService = new CategoryService(db)
  const supplierService = new SupplierService(db)
  const storeService = new StoreService(db)
  const customerCategoryService = new CustomerCategoryService(db)
  const customerService = new CustomerService(db)
  const uomService = new UomService(db)

  // Initialize core entity services
  const userService = new UserService(db)
  const productService = new ProductService(db)
  const roleService = new RoleService(db)
  const userRoleService = new UserRoleService(db)
  const permissionService = new PermissionService(db)
  const rolePermissionService = new RolePermissionService(db)
  const authService = new AuthService(db)

  // Initialize inventory services
  const productPriceService = new ProductPriceService(db)
  const productLocationService = new ProductLocationService(db)
  const batchService = new BatchService(db)
  const stockTransactionService = new StockTransactionService(db)
  const pricingService = new PricingService(db)
  const priceCategoryService = new PriceCategoryService(db)

  // Initialize sales/POS service (with inventory integration for INV-001)
  const transactionService = new TransactionService(
    db,
    stockTransactionService,
    productLocationService
  )

  // Initialize purchasing service
  const purchaseOrderService = new PurchaseOrderService(db)

  // Initialize expense service
  const expenseService = new ExpenseService(db)

  // Initialize shift service
  const shiftService = new ShiftService(db, expenseService)

  // Initialize app config service
  const appConfigService = new AppConfigService(db)

  // Initialize receipt service
  const receiptService = new ReceiptService(appConfigService, productService)

  // Initialize sync service (sql.js local + Drizzle+pg cloud)
  const syncService = new SyncService(db)

  // Auto-connect to cloud if PG_DATABASE_URL or DATABASE_URL is set
  const pgUrl = process.env.PG_DATABASE_URL || process.env.DATABASE_URL
  if (pgUrl) {
    try {
      await syncService.initCloudConnection(pgUrl)
      console.log('✓ Auto-connected to cloud database')
    } catch (error) {
      console.warn('⚠ Cloud auto-connect failed:', error instanceof Error ? error.message : error)
      console.log('  App will run in offline mode. You can connect manually later.')
    }
  }

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
  const syncController = new SyncController(syncService)
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
  syncController.registerHandlers()
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

  console.log('✓ All 23 services and controllers initialized (sql.js local + cloud sync ready)')
}
