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

### 📦 `inventory.prisma` - Inventory Management
**Models:** ProductLocation, StockTransaction, StockAdjustment
**Enums:** StockTransactionType

Store-based inventory management:
- Product locations within stores
- Stock transaction ledger (inbound, outbound, transfers)
- Stock adjustments and corrections
- **Note:** Each store manages its own inventory (no separate warehouse)

### 🏪 `store.prisma` - Store & Customer
**Models:** Store, Customer, CustomerCategory

Retail store and customer management:
- Store locations and details (each store has its own inventory)
- Customer information
- Customer categories
- Store type (RETAIL, WAREHOUSE, etc.)

### 🛒 `purchasing.prisma` - Purchasing Management
**Models:** PurchaseOrder, PurchaseOrderItem
**Enums:** PurchaseOrderStatus

Purchase order management:
- Purchase orders from suppliers
- PO line items
- PO status tracking (draft, ordered, received, cancelled)

### 🚚 `transfer.prisma` - Store Transfers
**Models:** TransferRequest, TransferItem

Inter-store transfer operations:
- Transfer requests between stores
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
├─ performs StockTransaction (inventory.prisma)
├─ performs StockAdjustment (inventory.prisma)
├─ creates Transactions (sales.prisma)
└─ has AuditLog entries (audit.prisma)

Product (product.prisma)
├─ belongs to Category (product.prisma)
├─ has many Batch (product.prisma)
├─ has many ProductPrice (product.prisma)
├─ has many ProductLocation (inventory.prisma)
├─ in StockTransaction (inventory.prisma)
├─ in StockAdjustment (inventory.prisma)
├─ in PurchaseOrderItem (purchasing.prisma)
├─ in TransferItem (transfer.prisma)
└─ in TransactionItems (sales.prisma)

Store (store.prisma)
├─ has many User (auth.prisma)
├─ has many ProductPrice (product.prisma)
├─ has many ProductLocation (inventory.prisma)
├─ has many StockTransaction (inventory.prisma)
├─ has many StockAdjustment (inventory.prisma)
├─ has many PurchaseOrder (purchasing.prisma)
├─ has many Transactions (sales.prisma)
└─ source/destination for TransferRequest (transfer.prisma)

Customer (store.prisma)
├─ belongs to CustomerCategory (store.prisma)
├─ has many StockTransaction (inventory.prisma)
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

## Architecture Changes

### Warehouse Consolidation

**Previous Architecture:**
- Separate `Warehouse` and `Store` models
- Stores belonged to warehouses
- Inventory tracked at warehouse level

**Current Architecture:**
- Single `Store` model handles both retail and warehouse functions
- Each store manages its own inventory
- Store `type` field distinguishes between RETAIL, WAREHOUSE, etc.
- Simpler data model with fewer joins

**Benefits:**
- ✅ Simplified schema - one less model to manage
- ✅ Easier queries - no warehouse joins needed
- ✅ Flexible - stores can be retail locations or warehouses
- ✅ Better for multi-location businesses where each location is independent

**Database Changes Required:**
```sql
-- Migration will rename columns:
-- warehouseId → storeId in:
--   - product_location
--   - stock_transaction
--   - stock_adjustment
--   - purchase_order
--   - transfer_request (source_id, destination_id)
```

## Migration from Old Structure

Old files have been deprecated:
- `user.prisma` → moved to `auth.prisma`
- `role_permission.prisma` → split into feature files
- `warehouse.prisma` → consolidated into `store.prisma` + `inventory.prisma`

All models are now in their respective feature-based files for better organization.
