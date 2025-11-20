import { getDb } from './db'
import { 
  CategoryController,
  SupplierController,
  StoreController,
  CustomerCategoryController,
  CustomerController,
  UserController,
  ProductController,
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
  SyncService
} from './services'

/**
 * Bootstrap the application by initializing services and controllers
 */
export async function bootstrap(): Promise<void> {
  // Get sql.js database instance (async)
  const db = await getDb()

  // Initialize all services (migrated to sql.js)
  const categoryService = new CategoryService(db)
  const supplierService = new SupplierService(db)
  const storeService = new StoreService(db)
  const customerCategoryService = new CustomerCategoryService(db)
  const customerService = new CustomerService(db)
  const userService = new UserService(db)
  const productService = new ProductService(db)
  
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
  const syncController = new SyncController(syncService)

  // Register IPC handlers
  categoryController.registerHandlers()
  supplierController.registerHandlers()
  storeController.registerHandlers()
  customerCategoryController.registerHandlers()
  customerController.registerHandlers()
  userController.registerHandlers()
  productController.registerHandlers()
  syncController.registerHandlers()

  console.log('✓ All services initialized (sql.js local + cloud sync ready)')
}
