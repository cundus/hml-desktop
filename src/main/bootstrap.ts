import { getDb } from './db'
import { UserController, ProductController, SyncController } from './controllers'
import { UserService, ProductService, SyncService } from './services'

/**
 * Bootstrap the application by initializing services and controllers
 */
export function bootstrap(): void {
  // Get Drizzle instance
  const db = getDb()

  // Initialize services
  const userService = new UserService(db)
  const productService = new ProductService(db)
  const syncService = new SyncService(db)

  // Initialize controllers
  const userController = new UserController(userService)
  const productController = new ProductController(productService)
  const syncController = new SyncController(syncService)

  // Register IPC handlers
  userController.registerHandlers()
  productController.registerHandlers()
  syncController.registerHandlers()

  console.log('✓ Services and controllers initialized')
}
