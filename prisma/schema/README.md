# Prisma Schema Organization

The Prisma schema has been organized by feature category for better maintainability and clarity.

## Schema Files

### 📁 `schema.prisma`
Main configuration file containing generator and datasource settings.

### 🔐 `auth.prisma` - Authentication & Authorization
**Models:** User, Role, Permission, UserRole, RolePermission

Handles all RBAC (Role-Based Access Control) functionality:
- User management
- Role definitions
- Permission definitions
- User-to-role assignments
- Role-to-permission assignments

### 📦 `product.prisma` - Product Management
**Models:** Product, Category, Supplier, ProductPrice, Batch

Core product catalog and related entities:
- Product master data (SKU, name, cost, etc.)
- Product categories
- Supplier information
- Store-specific pricing
- Batch/lot tracking

### 🏭 `warehouse.prisma` - Warehouse & Inventory
**Models:** Warehouse, ProductLocation, StockTransaction, StockAdjustment
**Enums:** StockTransactionType

Inventory management and warehouse operations:
- Warehouse definitions
- Product locations within warehouses
- Stock transaction ledger (inbound, outbound, transfers)
- Stock adjustments and corrections

### 🏪 `store.prisma` - Store & Customer
**Models:** Store, Customer

Retail store and customer management:
- Store locations and details
- Customer information
- Store-warehouse relationships

### 🛒 `purchasing.prisma` - Purchasing Management
**Models:** PurchaseOrder, PurchaseOrderItem
**Enums:** PurchaseOrderStatus

Purchase order management:
- Purchase orders from suppliers
- PO line items
- PO status tracking (draft, ordered, received, cancelled)

### 🚚 `transfer.prisma` - Warehouse Transfers
**Models:** TransferRequest, TransferItem

Inter-warehouse transfer operations:
- Transfer requests between warehouses
- Transfer line items
- Transfer tracking

### 💰 `sales.prisma` - Sales / POS Transactions
**Models:** Transactions, TransactionItems

Point-of-sale and sales transactions:
- Sales transactions
- Transaction line items
- Discounts, tax, and totals

### 📋 `audit.prisma` - Audit Log
**Models:** AuditLog

System audit trail:
- User actions logging
- System event tracking

## Model Relationships

```
User (auth.prisma)
├─ belongs to Store (store.prisma)
├─ has many UserRole (auth.prisma)
├─ performs StockTransaction (warehouse.prisma)
├─ performs StockAdjustment (warehouse.prisma)
├─ creates Transactions (sales.prisma)
└─ has AuditLog entries (audit.prisma)

Product (product.prisma)
├─ belongs to Category (product.prisma)
├─ has many Batch (product.prisma)
├─ has many ProductPrice (product.prisma)
├─ has many ProductLocation (warehouse.prisma)
├─ in StockTransaction (warehouse.prisma)
├─ in StockAdjustment (warehouse.prisma)
├─ in PurchaseOrderItem (purchasing.prisma)
├─ in TransferItem (transfer.prisma)
└─ in TransactionItems (sales.prisma)

Warehouse (warehouse.prisma)
├─ has many Store (store.prisma)
├─ has many ProductLocation (warehouse.prisma)
├─ has many StockTransaction (warehouse.prisma)
├─ has many StockAdjustment (warehouse.prisma)
├─ has many PurchaseOrder (purchasing.prisma)
├─ source/destination for TransferRequest (transfer.prisma)
└─ used in Transactions (sales.prisma)

Store (store.prisma)
├─ belongs to Warehouse (warehouse.prisma)
├─ has many User (auth.prisma)
├─ has many ProductPrice (product.prisma)
└─ has many Transactions (sales.prisma)
```

## Common Fields

All models include these standard fields for soft deletes and sync:

```prisma
createdAt DateTime  @default(now()) @map("created_at")
updatedAt DateTime  @updatedAt @map("updated_at")
syncedAt  DateTime? @map("synced_at")
deletedAt DateTime? @map("deleted_at")
deviceId  String?   @map("device_id")
```

- **createdAt**: Record creation timestamp
- **updatedAt**: Last update timestamp
- **syncedAt**: Last cloud sync timestamp (for offline-first)
- **deletedAt**: Soft delete timestamp (null = active)
- **deviceId**: Device identifier (for offline-first sync)

## Naming Conventions

- **Models**: PascalCase (e.g., `User`, `ProductPrice`)
- **Fields**: camelCase (e.g., `userId`, `createdAt`)
- **Database Tables**: snake_case via `@@map` (e.g., `user`, `product_price`)
- **Database Columns**: snake_case via `@map` (e.g., `user_id`, `created_at`)

## Soft Delete Pattern

All models support soft deletes via the `deletedAt` field:

```typescript
// Query only active records
const activeProducts = await prisma.product.findMany({
  where: { deletedAt: null }
})

// Soft delete
await prisma.product.update({
  where: { id },
  data: { deletedAt: new Date() }
})

// Restore
await prisma.product.update({
  where: { id },
  data: { deletedAt: null }
})
```

## Usage

### Generate Prisma Client
```bash
npx prisma generate
```

### Create Migration
```bash
npx prisma migrate dev --name descriptive_name
```

### Push Schema (Development)
```bash
npx prisma db push
```

### View Database
```bash
npx prisma studio
```

## Benefits of This Organization

✅ **Clear Separation of Concerns** - Each file focuses on one domain
✅ **Easier Navigation** - Find models quickly by feature
✅ **Better Collaboration** - Team members can work on different features
✅ **Reduced Merge Conflicts** - Changes isolated to specific files
✅ **Self-Documenting** - File names indicate purpose
✅ **Scalable** - Easy to add new features without cluttering

## Migration from Old Structure

Old files (`user.prisma`, `role_permission.prisma`) have been deprecated and cleared. All models are now in their respective feature-based files.

If you have existing migrations, they will continue to work. The database schema remains unchanged—only the organization of the Prisma schema files has been improved.
