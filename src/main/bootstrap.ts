import { getPrisma } from './db'
import { UserController, ProductController } from './controllers'
import { UserService, ProductService } from './services'

/**
 * Bootstrap the application by initializing services and controllers
 */
export function bootstrap(): void {
  // Get Prisma instance
  const prisma = getPrisma()

  // Initialize services
  const userService = new UserService(prisma)
  const productService = new ProductService(prisma)

  // Initialize controllers
  const userController = new UserController(userService)
  const productController = new ProductController(productService)

  // Register IPC handlers
  userController.registerHandlers()
  productController.registerHandlers()

  console.log('✓ Services and controllers initialized')
}
