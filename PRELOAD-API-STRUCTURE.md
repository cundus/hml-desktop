# Preload API Structure

## 📁 Modular Organization

The preload API has been reorganized into feature-based modules for better maintainability and scalability.

---

## File Structure

```
src/preload/
├── api/
│   ├── types.ts              # Common types (ApiResponse, BaseEntity, etc.)
│   ├── master-data.ts        # Master data APIs (Category, Supplier, Store, etc.)
│   ├── core.ts               # Core entity APIs (User, Product)
│   ├── inventory.ts          # Inventory APIs (ProductPrice, ProductLocation, Batch, StockTransaction)
│   ├── sales.ts              # Sales/POS APIs (Transaction)
│   ├── purchasing.ts         # Purchasing APIs (PurchaseOrder)
│   ├── sync.ts               # Sync APIs
│   └── index.ts              # Main export aggregator
├── index.ts                  # Preload entry point
└── index.d.ts                # TypeScript type definitions
```

---

## API Modules

### 1. **types.ts** - Common Types

```typescript
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
}

export interface SyncStatus { ... }
export interface SyncResult { ... }
```

### 2. **master-data.ts** - Master Data APIs

**Exports:**
- `categoryApi` - Product categories
- `supplierApi` - Suppliers
- `storeApi` - Stores/branches
- `customerCategoryApi` - Customer categories
- `customerApi` - Customers

**Example Usage:**
```typescript
// Get all categories
const result = await window.api.db.categories.getAll()

// Create a supplier
const supplier = await window.api.db.suppliers.create({
  name: 'ABC Supplier',
  phone: '123-456-7890',
  address: '123 Main St'
})

// Search customers
const customers = await window.api.db.customers.search('John')
```

### 3. **core.ts** - Core Entity APIs

**Exports:**
- `userApi` - User management
- `productApi` - Product management

**Example Usage:**
```typescript
// Get user by email
const user = await window.api.db.users.getByEmail('user@example.com')

// Search products
const products = await window.api.db.products.search('laptop')

// Toggle product active status
await window.api.db.products.toggleActive(productId)
```

### 4. **inventory.ts** - Inventory Management APIs

**Exports:**
- `productPriceApi` - Store-specific pricing
- `productLocationApi` - Inventory tracking per store
- `batchApi` - Product batch management
- `stockTransactionApi` - Inventory movement tracking

**Example Usage:**
```typescript
// Get product price for specific store
const price = await window.api.db.productPrices.getByProductAndStore(
  productId, 
  storeId
)

// Adjust inventory quantity
await window.api.db.productLocations.adjustQuantity(
  productId, 
  storeId, 
  10 // add 10 units
)

// Reserve quantity for order
await window.api.db.productLocations.reserveQuantity(
  productId, 
  storeId, 
  5
)

// Get expiring batches
const expiring = await window.api.db.batches.getExpiring(30) // 30 days

// Get stock summary
const summary = await window.api.db.stockTransactions.getStockSummary(
  productId, 
  storeId
)
```

### 5. **sales.ts** - Sales/POS APIs

**Exports:**
- `transactionApi` - Sales transactions

**Example Usage:**
```typescript
// Create a sale transaction
const transaction = await window.api.db.transactions.create({
  code: 'TRX-001',
  storeId: 'store-id',
  subtotal: '100.00',
  discount: '10.00',
  tax: '5.00',
  total: '95.00',
  customerId: 'customer-id',
  userId: 'user-id',
  items: [
    { productId: 'prod-1', quantity: 2, price: '50.00' }
  ]
})

// Get sales summary
const summary = await window.api.db.transactions.getSalesSummary(
  storeId,
  '2025-01-01', // start date
  '2025-01-31'  // end date
)
```

### 6. **purchasing.ts** - Purchasing APIs

**Exports:**
- `purchaseOrderApi` - Purchase order management

**Example Usage:**
```typescript
// Create purchase order
const po = await window.api.db.purchaseOrders.create({
  code: 'PO-001',
  supplierId: 'supplier-id',
  storeId: 'store-id',
  status: 'DRAFT',
  total: '1000.00',
  items: [
    { productId: 'prod-1', quantity: 10, cost: '100.00' }
  ]
})

// Update PO status
await window.api.db.purchaseOrders.update(poId, {
  status: 'ORDERED'
})

// Get POs by status
const draftPOs = await window.api.db.purchaseOrders.getByStatus('DRAFT')
```

### 7. **sync.ts** - Sync APIs

**Exports:**
- `syncApi` - Cloud synchronization

**Example Usage:**
```typescript
// Initialize cloud connection
await window.api.db.sync.initCloud('postgresql://...')

// Full sync
const result = await window.api.db.sync.fullSync()
console.log(`Pulled: ${result.data.pulled}, Pushed: ${result.data.pushed}`)

// Get sync status
const status = await window.api.db.sync.getStatus()
console.log(`Unsynced records: ${status.data.unsyncedRecordsCount}`)
```

---

## Complete API Reference

### Master Data APIs

| API | Methods |
|-----|---------|
| **categories** | `getAll`, `getById`, `create`, `update`, `delete`, `restore` |
| **suppliers** | `getAll`, `getById`, `search`, `create`, `update`, `delete`, `restore` |
| **stores** | `getAll`, `getById`, `getByCode`, `getByType`, `search`, `create`, `update`, `delete`, `restore` |
| **customerCategories** | `getAll`, `getById`, `create`, `update`, `delete`, `restore` |
| **customers** | `getAll`, `getById`, `search`, `getByCategory`, `create`, `update`, `delete`, `restore` |

### Core APIs

| API | Methods |
|-----|---------|
| **users** | `getAll`, `getById`, `getByEmail`, `create`, `update`, `delete`, `hardDelete`, `restore` |
| **products** | `getAll`, `getById`, `getBySku`, `search`, `getByCategory`, `create`, `update`, `delete`, `restore`, `toggleActive` |

### Inventory APIs

| API | Methods |
|-----|---------|
| **productPrices** | `getAll`, `getById`, `getByProductId`, `getByStoreId`, `getByProductAndStore`, `create`, `update`, `delete`, `restore` |
| **productLocations** | `getAll`, `getById`, `getByProductId`, `getByStoreId`, `getByProductAndStore`, `create`, `update`, `adjustQuantity`, `reserveQuantity`, `releaseReservedQuantity`, `delete` |
| **batches** | `getAll`, `getById`, `getByCode`, `getByProductId`, `getExpiring`, `create`, `update`, `delete` |
| **stockTransactions** | `getAll`, `getById`, `getByProductId`, `getByStoreId`, `getByType`, `getByReference`, `create`, `getStockSummary`, `delete` |

### Sales APIs

| API | Methods |
|-----|---------|
| **transactions** | `getAll`, `getById`, `getByCode`, `getByStoreId`, `getByCustomerId`, `getByUserId`, `create`, `getSalesSummary`, `delete`, `restore` |

### Purchasing APIs

| API | Methods |
|-----|---------|
| **purchaseOrders** | `getAll`, `getById`, `getByCode`, `getBySupplierId`, `getByStoreId`, `getByStatus`, `create`, `update`, `delete` |

### Sync APIs

| API | Methods |
|-----|---------|
| **sync** | `initCloud`, `disconnect`, `fullSync`, `pullFromCloud`, `pushToCloud`, `initialSync`, `getStatus` |

---

## Type Safety

All APIs are fully typed with TypeScript. Import types as needed:

```typescript
import type {
  Category,
  Supplier,
  Store,
  Customer,
  User,
  Product,
  ProductPrice,
  ProductLocation,
  Batch,
  StockTransaction,
  Transaction,
  PurchaseOrder,
  ApiResponse,
  SyncStatus,
  SyncResult
} from '@/preload/api'
```

---

## Usage in Renderer

```typescript
// In any React component or TypeScript file

// Master Data
const categories = await window.api.db.categories.getAll()
const suppliers = await window.api.db.suppliers.search('ABC')

// Core
const users = await window.api.db.users.getAll()
const products = await window.api.db.products.getByCategory(categoryId)

// Inventory
const prices = await window.api.db.productPrices.getByStoreId(storeId)
await window.api.db.productLocations.adjustQuantity(productId, storeId, 10)
const expiring = await window.api.db.batches.getExpiring(30)

// Sales
const transactions = await window.api.db.transactions.getByStoreId(storeId)
const summary = await window.api.db.transactions.getSalesSummary(storeId)

// Purchasing
const pos = await window.api.db.purchaseOrders.getByStatus('DRAFT')

// Sync
await window.api.db.sync.fullSync()
const status = await window.api.db.sync.getStatus()
```

---

## Benefits of Modular Structure

1. **Better Organization** - APIs grouped by feature/domain
2. **Easier Maintenance** - Each module can be updated independently
3. **Improved Readability** - Clear separation of concerns
4. **Type Safety** - Full TypeScript support with proper types
5. **Scalability** - Easy to add new APIs without cluttering a single file
6. **Tree Shaking** - Unused modules can be eliminated by bundler
7. **Code Reusability** - Types and utilities shared across modules

---

## Adding New APIs

To add a new API module:

1. Create a new file in `src/preload/api/` (e.g., `reports.ts`)
2. Define types and API functions
3. Export from `src/preload/api/index.ts`
4. Use in renderer via `window.api.db.yourNewApi`

Example:

```typescript
// src/preload/api/reports.ts
import { ipcRenderer } from 'electron'
import { ApiResponse } from './types'

export interface Report {
  id: string
  name: string
  data: any
}

export const reportApi = {
  generate: (type: string) => 
    ipcRenderer.invoke('db:reports:generate', type) as Promise<ApiResponse<Report>>
}

// src/preload/api/index.ts
export * from './reports'
import { reportApi } from './reports'

export const db = {
  // ... existing APIs
  reports: reportApi
}
```

---

## Migration Notes

The old monolithic structure has been replaced with this modular approach. All existing functionality is preserved, with the following improvements:

- ✅ All 14 services now have API endpoints
- ✅ Proper TypeScript types for all entities
- ✅ Consistent API patterns across all modules
- ✅ Better error handling with ApiResponse wrapper
- ✅ Full IntelliSense support in IDE

---

**Status**: ✅ Complete - All APIs Modularized and Type-Safe
