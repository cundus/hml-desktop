import { getDb } from './db'
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
  SyncController
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
  SyncService
} from './services'

/**
 * Bootstrap the application by initializing services and controllers
 */
export async function bootstrap(): Promise<void> {
  // Get sql.js database instance (async)
  const db = await getDb()

  // Initialize master data services
  const categoryService = new CategoryService(db)
  const supplierService = new SupplierService(db)
  const storeService = new StoreService(db)
  const customerCategoryService = new CustomerCategoryService(db)
  const customerService = new CustomerService(db)
  
  // Initialize core entity services
  const userService = new UserService(db)
  const productService = new ProductService(db)
  
  // Initialize inventory services
  const productPriceService = new ProductPriceService(db)
  const productLocationService = new ProductLocationService(db)
  const batchService = new BatchService(db)
  const stockTransactionService = new StockTransactionService(db)
  
  // Initialize sales/POS service
  const transactionService = new TransactionService(db)
  
  // Initialize purchasing service
  const purchaseOrderService = new PurchaseOrderService(db)
  
  // Initialize sync service (sql.js local + Drizzle+pg cloud)
  const syncService = new SyncService(db)

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

  console.log('✓ All 14 services and controllers initialized (sql.js local + cloud sync ready)')
}
