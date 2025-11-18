import { getPrisma } from './db'
import { UserController, ProductController, SyncController } from './controllers'
import { UserService, ProductService, SyncService } from './services'

/**
 * Bootstrap the application by initializing services and controllers
 */
export function bootstrap(): void {
  // Get Prisma instance
  const prisma = getPrisma()

  // Initialize services
  const userService = new UserService(prisma)
  const productService = new ProductService(prisma)
  const syncService = new SyncService(prisma)

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
