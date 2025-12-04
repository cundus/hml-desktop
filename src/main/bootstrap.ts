import { getDb } from './db'
import { resetAndReseedPermissions, seedAdmin, seedUoms } from './seed'
import {
  CategoryController,
  SupplierController,
  StoreController,
  CustomerCategoryController,
  CustomerController,
  UserController,
  ProductController,
  ProductPriceController,
  ProductLocationController,
  BatchController,
  StockTransactionController,
  TransactionController,
  PurchaseOrderController,
  SyncController,
  RoleController,
  UserRoleController,
  PermissionController,
  RolePermissionController,
  AuthController,
  UomController
} from './controllers'
import {
  CategoryService,
  SupplierService,
  StoreService,
  CustomerCategoryService,
  CustomerService,
  UserService,
  ProductService,
  ProductPriceService,
  ProductLocationService,
  BatchService,
  StockTransactionService,
  TransactionService,
  PurchaseOrderService,
  SyncService,
  RoleService,
  UserRoleService,
  PermissionService,
  RolePermissionService,
  AuthService,
  UomService
} from './services'
import { ShiftService } from './services/shift.service'
import { registerShiftHandlers } from './controllers/shift.controller'
import { AppConfigService } from './services/app-config.service'
import { registerAppConfigHandlers } from './controllers/app-config.controller'

/**
 * Bootstrap the application by initializing services and controllers
 */
export async function bootstrap(): Promise<void> {
  // Get sql.js database instance (async)
  const db = await getDb()

  // Seed static reference data
  await resetAndReseedPermissions(db) // TEMPORARY: Use reset to fix duplicates
  await seedAdmin(db)
  await seedUoms(db)

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

  // Initialize sales/POS service
  const transactionService = new TransactionService(db)

  // Initialize purchasing service
  const purchaseOrderService = new PurchaseOrderService(db)

  // Initialize shift service
  const shiftService = new ShiftService(db)

  // Initialize app config service
  const appConfigService = new AppConfigService(db)

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

  // Register IPC handlers
  categoryController.registerHandlers()
  supplierController.registerHandlers()
  storeController.registerHandlers()
  customerCategoryController.registerHandlers()
  customerController.registerHandlers()
  userController.registerHandlers()
  productController.registerHandlers()
  productPriceController.registerHandlers()
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
  registerShiftHandlers(shiftService)
  registerAppConfigHandlers(appConfigService)

  console.log('✓ All 22 services and controllers initialized (sql.js local + cloud sync ready)')
}
