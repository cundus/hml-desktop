# Multi-UOM & Per-Store Pricing – Development Spec

## 1. Goals

- Support **multi-level UOM per product** (e.g. `PCS`, `BOX`, `DUS`) with:
  - Configurable **conversion factors** (e.g. 1 BOX = 10 PCS, 1 DUS = 10 BOX).
  - **Own price per UOM** (PCS, BOX, DUS can each have different prices).
- Support **per-store pricing override** per product per UOM.
- Keep **inventory quantities** stored in **base unit only** (e.g. PCS) to avoid inconsistencies.
- Integrate with existing flows:
  - Product master / Warehouse pricing
  - Purchasing & stock-in
  - Sales (ProductSelectModal → Cart → Transaction → Receipt)
  - Inventory views & reports

---

## 2. Data Model / Schema

### 2.1 Existing Entities (assumed)

- `products`
  - `id`
  - `name`
  - `sku`
  - `category_id`
  - `cost` (legacy, will be superseded by per-UOM pricing)
  - `price` (legacy, will be superseded by per-UOM pricing)
  - _other product fields_

- `uoms`
  - `id`
  - `code` (e.g. `PCS`, `BOX`, `DUS`)
  - `name`

- Inventory-related tables (names may vary):
  - `inventory_stocks` / `warehouse_stocks` / `stock_transactions`
  - All quantities will be treated as **base-unit quantities** going forward.

### 2.2 New / Updated Schema

#### 2.2.1 Products – Base UOM

Add base UOM reference to `products`:

```sql
ALTER TABLE products
  ADD COLUMN base_uom_id TEXT; -- references uoms.id (e.g. PCS)
```

Rules:

- Each product has exactly **one base UOM** (usually the smallest, e.g. PCS).
- All inventory quantities are stored in **base UOM** only.

#### 2.2.2 `product_uoms` – Conversion & Default Pricing

New junction table mapping products to their available UOMs:

```sql
CREATE TABLE product_uoms (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  uom_id TEXT NOT NULL,                -- references uoms.id
  conversion_factor REAL NOT NULL,     -- how many base units in 1 of this UOM
                                       -- e.g. BOX: 10 (pcs), DUS: 100 (pcs)
  base_price REAL NOT NULL DEFAULT 0,  -- default price per UOM (HQ price)
  is_base_unit BOOLEAN NOT NULL DEFAULT FALSE,

  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (uom_id) REFERENCES uoms(id),
  UNIQUE (product_id, uom_id)
);
```

Rules:

- Exactly **one** row per product must have `is_base_unit = TRUE`.
- That rows `uom_id` must match `products.base_uom_id`.
- For the base UOM row, `conversion_factor = 1`.

This table defines all valid UOM levels and default (global/HQ) prices.

#### 2.2.3 `store_product_uom_prices` – Per-Store Pricing Overrides

New table for store-specific price overrides per product per UOM:

```sql
CREATE TABLE store_product_uom_prices (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  uom_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  price REAL NOT NULL,

  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (uom_id) REFERENCES uoms(id),
  FOREIGN KEY (store_id) REFERENCES stores(id),
  UNIQUE (product_id, uom_id, store_id)
);
```

Price resolution logic:

1. Look for `store_product_uom_prices(product_id, uom_id, current_store_id)`.
2. If not found, fall back to `product_uoms.base_price` for that `(product_id, uom_id)`.

This keeps branching in **data**, not hard-coded conditions in UI.

---

## 3. Core Logic Flows

### 3.1 Price Resolution

Backend/service-level helper (pseudocode):

```ts
async function getPriceForProductUom(
  productId: string,
  uomId: string,
  storeId: string | null
): Promise<number> {
  // 1. Try store-specific override
  const override = await db.store_product_uom_prices.findOne({ productId, uomId, storeId })
  if (override) return override.price

  // 2. Fallback to default/base price on product_uoms
  const productUom = await db.product_uoms.findOne({ productId, uomId })
  return productUom?.base_price ?? 0
}
```

Used by:

- Sales (when building `ProductSelectModal` options)
- Warehouse/HQ pricing screens (to preview effective prices)
- Purchasing suggestions (optional)

### 3.2 Inventory Model

- **Storage:**
  - All stock quantities in DB are stored in **base units** (e.g. PCS).
- **Conversions:**
  - `conversion_factor` on `product_uoms` tells how many base units are in 1 unit of that UOM.
- **Transactions (sales / purchase / adjustments):**
  - Per line item: `baseQuantity = quantity_in_selected_uom * conversion_factor`.
  - Stock movements always use `baseQuantity`.

Example:

- Product A:
  - base UOM: PCS
  - BOX: factor = 10
  - DUS: factor = 100
- Sell `2 DUS`:
  - `baseQuantity = 2 * 100 = 200 pcs`
  - Inventory deduction uses 200 (in PCS).

---

## 4. Sales (Cashier) Flow

### 4.1 Frontend Data Structures

#### 4.1.1 UOM options (ProductSelectModal)

```ts
interface UomOption {
  id: string // uom_id
  code: string // 'PCS', 'BOX', 'DUS'
  name: string
  conversionFactor: number
}
```

Populate from `product_uoms` for the active product.

#### 4.1.2 ProductSelectResult

Extend the existing result type to carry base quantity and selected UOM info:

```ts
interface ProductSelectResult {
  product: ProductForSelection
  selectedUom: UomOption
  selectedPrice: {
    id: string // optional price category id, if used
    name: string
    price: number // price per selected UOM (after store override)
  }
  quantity: number // in selected UOM (e.g. 2 DUS)
  unitPrice: number // price per selected UOM
  totalPrice: number // quantity * unitPrice
  baseQuantity: number // quantity * selectedUom.conversionFactor
}
```

### 4.2 Product Selection Logic Flow

1. **Product search** in `ProductBrowser` works as today.
2. Cashier hits **Enter** on a product.
3. `SalesPage` opens `ProductSelectModal` with `productId` and `currentStoreId`.
4. `ProductSelectModal` logic:
   - Load all `product_uoms` for `productId`.
   - Map each to `UomOption` (code, name, conversionFactor).
   - For each UOM, call `getPriceForProductUom(productId, uomId, currentStoreId)`
     to resolve the effective price.
   - Render UOM chips/buttons and price categories as today, but backed by this data.
   - User selects:
     - UOM (PCS/BOX/DUS etc.)
     - Price option (if multiple, e.g. retail/wholesale)
     - Quantity (in selected UOM)
   - On **Confirm**:
     - Compute `baseQuantity = quantity * conversionFactor`.
     - Compute `totalPrice = quantity * unitPrice`.
     - Return `ProductSelectResult` to `SalesPage` via `onConfirm`.

The **visible UX** remains very similar; we only enrich the result with `baseQuantity` and proper multi-UOM pricing.

### 4.3 Cart & SalesPage Logic

#### 4.3.1 Cart item structure

```ts
interface CartItem {
  id: string // composite: productId + uomId + priceId
  productId: string
  name: string
  sku: string

  uomId: string
  uomCode: string
  conversionFactor: number

  quantity: number // in selected UOM
  baseQuantity: number // quantity * conversionFactor

  unitPrice: number // per selected UOM
  subtotal: number // quantity * unitPrice

  // optional: discount, tax, notes, etc.
}
```

#### 4.3.2 `handleProductSelectConfirm`

When `ProductSelectModal` confirms:

- If an item with same `(productId, uomId, priceId)` exists:
  - Increment `quantity` and `baseQuantity`.
  - Recompute `subtotal`.
- Otherwise, append a new `CartItem` with all fields from `ProductSelectResult`.

Pseudo:

```ts
const handleProductSelectConfirm = (result: ProductSelectResult): void => {
  const { product, selectedUom, selectedPrice, quantity, unitPrice, totalPrice, baseQuantity } =
    result

  const cartItemId = `${product.id}-${selectedUom.id}-${selectedPrice.id}`

  setCartItems((prev) => {
    const existing = prev.find((i) => i.id === cartItemId)
    if (existing) {
      const newQty = existing.quantity + quantity
      const newBaseQty = existing.baseQuantity + baseQuantity
      return prev.map((i) =>
        i.id === cartItemId
          ? {
              ...i,
              quantity: newQty,
              baseQuantity: newBaseQty,
              subtotal: newQty * unitPrice
            }
          : i
      )
    }

    return [
      ...prev,
      {
        id: cartItemId,
        productId: product.id,
        name: product.name,
        sku: product.sku,
        uomId: selectedUom.id,
        uomCode: selectedUom.code,
        conversionFactor: selectedUom.conversionFactor,
        quantity,
        baseQuantity,
        unitPrice,
        subtotal: totalPrice
      }
    ]
  })
}
```

#### 4.3.3 Editing quantity in Cart

- Cart UI shows `quantity` in **selected UOM**.
- When user changes quantity or removes item:
  - Always recompute `baseQuantity = quantity * conversionFactor`.
  - Recompute `subtotal = quantity * unitPrice`.

### 4.4 Checkout Payload (to Backend)

Transaction payload should carry both display and base quantities:

```ts
interface SalesDetailPayload {
  productId: string
  uomId: string
  uomCode: string

  quantity: number // in selected UOM
  baseQuantity: number // quantity * conversionFactor

  unitPrice: number // per selected UOM
  subtotal: number
}

interface SalesTransactionPayload {
  invoiceNumber: string
  date: string
  customerId: string | null
  storeId: string
  paymentMethod: 'cash' | 'card' | 'qris' | 'credit'
  items: SalesDetailPayload[]

  // totals, discounts, taxes, etc.
}
```

Backend uses `baseQuantity` for stock movement.

---

## 5. Inventory & Purchasing Flows

### 5.1 Purchasing / Stock In

When registering incoming stock:

- UI may allow entering quantity in any UOM (PCS/BOX/DUS).
- Compute `baseQuantity = qty_in_uom * conversion_factor`.
- Persist `baseQuantity` in stock transaction tables.

Optional enhancements:

- Supplier prices per UOM can be stored similarly to store prices
  (e.g. `supplier_product_uom_prices`).
- Warehouse pricing page can use `base_cost` + margin to suggest selling prices per UOM.

### 5.2 Inventory Display

Inventory tables store **base quantity** only (e.g. `stockBase = 356 pcs`).

For display per Product:

- Load all `product_uoms` sorted from largest factor to smallest.
- Convert using greedy algorithm:

Example (DUS=100, BOX=10, PCS=1, stockBase=356):

- `dus = floor(356 / 100) = 3`
- remainder1 = `356 % 100 = 56`
- `box = floor(56 / 10) = 5`
- remainder2 = `56 % 10 = 6`
- `pcs = 6`

Display as: `3 DUS, 5 BOX, 6 PCS`.

---

## 6. UI Flows Overview

### 6.1 Product Master / Warehouse Pricing

1. **Product Form**:
   - Select base UOM (drop-down of `uoms`).
   - Save as `products.base_uom_id`.

2. **Product UOMs Management (per product)**:
   - List existing UOM levels for this product (from `product_uoms`).
   - For each row:
     - UOM (dropdown, disabled if `is_base_unit`)
     - Conversion factor (base UOM per 1 this UOM)
     - Base price per UOM
     - Toggle `is_base_unit` (one must be true).
   - Add / remove UOM levels.

3. **Per-Store Pricing (optional screen)**:
   - Filter by store & product.
   - Table: UOM vs effective price:
     - Show default (`base_price`) and allow override per store (writes to `store_product_uom_prices`).

### 6.2 Sales (Cashier)

- **ProductBrowser**: unchanged behavior.
- **ProductSelectModal**:
  - Shows UOM chips (PCS/BOX/DUS) sourced from `product_uoms`.
  - Shows per-UOM price (resolved with `getPriceForProductUom`).
  - Shows quantity input (in selected UOM).
  - On confirm:
    - Returns `ProductSelectResult` with `baseQuantity`.
- **CartPanel**:
  - Shows item name, `quantity + uomCode` (e.g. `2 DUS`).
  - Totals based on `unitPrice` and `quantity`.
- **Checkout dialog**:
  - Sends `SalesTransactionPayload` with both `quantity` and `baseQuantity` per line.

### 6.3 Inventory Screens

- Product stock listing:
  - Pull base stock quantity from DB.
  - Use conversion factors from `product_uoms` to show human-friendly breakdown (DUS/BOX/PCS).

---

## 7. Migration & Transitional Notes

- Existing `products.cost` and `products.price` fields can be treated as:
  - Initial **base UOM** price (for products where only base UOM exists).
  - Migration script can create `product_uoms` rows for base UOM with `conversion_factor = 1` and `base_price = products.price`.
- Gradually introduce non-base UOM levels (BOX/DUS) per product using the new UI.
- Per-store overrides can be rolled out after the multi-UOM foundation is stable.

---

## 8. Edge Cases & Considerations

- **Rounding**: decide on rounding strategy when converting between UOMs or splitting stock.
- **Negative stock**: `baseQuantity` checks should prevent selling more than available base stock.
- **Price categories** (retail/wholesale): can be layered on top by extending `product_uoms` or a related table; this spec assumes one effective price per `(product, uom, store)`.
- **Performance**: cache `product_uoms` + `store_product_uom_prices` per store in memory where possible, especially for SalesPage.

This document should be used as the reference when implementing migrations, backend services, and frontend flows for multi-UOM and per-store pricing.
