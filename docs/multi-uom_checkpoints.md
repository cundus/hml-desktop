# Multi-UOM + Category + Per-Store Pricing – Checkpoints

You can paste this into [ultimate-task-tracker.md](cci:7://file:///d:/project/petshop-management-system/docs/ultimate-task-tracker.md:0:0-0:0) or keep it as a separate section.

---

## Phase 0 – Prep (Spec & Planning)

- [ ] **DOC-001 – Freeze Spec**
  - Finalize [docs/revised-multi-uom.md](cci:7://file:///d:/project/petshop-management-system/docs/revised-multi-uom.md:0:0-0:0) as the source of truth.
  - Decide initial `price_categories` to actually use (e.g. `RETAIL`, `WHOLESALE`, `MEMBER`).

---

## Phase 1 – Schema & Migration (Backend Only)

- [ ] **DB-001 – Create Core Tables**
  - `price_categories`
  - `product_uoms`
  - `product_uom_category_prices`
  - `store_product_uom_prices`
  - Do **not** remove/alter existing `products.price` / `products.cost` yet.

- [ ] **DB-002 – Mark Base UOM for Existing Products**
  - Add `base_uom_id` to `products`.
  - For each product:
    - Set `base_uom_id` from current unit.
    - Insert `product_uoms` row with `is_base_unit = TRUE`, `conversion_factor = 1`.

- [ ] **DB-003 – Seed Default Category Prices**
  - For each product:
    - Use legacy `price` as `RETAIL` price for base UOM.
    - Insert into `product_uom_category_prices`.

---

## Phase 2 – Backend Pricing Service

- [ ] **API-001 – Price Resolution Helper**
  - Implement `resolvePrice({ productId, uomId, categoryId, storeId })`:
    1. Check `store_product_uom_prices`.
    2. Fallback `product_uom_category_prices`.
    3. Throw error if missing.

- [ ] **API-002 – Read APIs for UI**
  - `getProductUoms(productId)`
  - `getAvailableCategoryPrices(productId, uomId, storeId)`

---

## Phase 3 – Admin / Master Data UI

- [ ] **UI-ADMIN-001 – Product UOM Management UI**
  - Per product:
    - Manage `product_uoms` rows (UOM, `conversion_factor`, `is_base_unit`).

- [ ] **UI-ADMIN-002 – Category Price Management (HQ)**
  - Per product + UOM:
    - Manage `product_uom_category_prices` (category + price).

- [ ] **UI-ADMIN-003 – Per-Store Override UI**
  - Per store:
    - Manage `store_product_uom_prices` for product + UOM + category.

---

## Phase 4 – Sales / Cashier Flow

- [ ] **SALES-001 – ProductSelectModal Uses New Pricing**
  - Load UOMs from `product_uoms`.
  - For each UOM, load available `(category, price)` using backend.
  - Only show categories that have a price for that UOM.
  - On confirm:
    - Include `uomId`, `priceCategoryId`, `quantity`, `baseQty`, `unitPrice`, `subtotal`.

- [ ] **SALES-002 – Cart & Checkout Payload**
  - Cart item shape includes:
    - `productId`, `uomId`, `uomCode`, `priceCategoryId`
    - `quantity` (UOM) + `baseQuantity`
    - `unitPrice`, `subtotal`
  - Checkout payload sends same fields to backend.

- [ ] **SALES-003 – Feature Flag / Backward Compat**
  - Config `enableMultiUomPricing`.
  - Old behaviour when `false`, new pricing when `true`.

---

## Phase 5 – Purchasing & Inventory Consistency

- [ ] **INV-001 – Base-Quantity Stock Movements**
  - Ensure all flows (sales, purchase, adjustments) compute:
    - `baseQty = qty * conversion_factor`.
  - Inventory tables assume base units only.

- [ ] **INV-002 – Stock Display in Multiple UOMs**
  - Convert base quantity to `DUS / BOX / PCS` for display using `product_uoms`.

---

## Phase 6 – Validation & Rollout

- [ ] **ROLLOUT-001 – Data Validation Scripts**
  - Check:
    - One base UOM per product.
    - No duplicate `(product, uom, price_category)` rows.
    - All FKs valid.

- [ ] **ROLLOUT-002 – Tests**
  - Unit/integration tests for:
    - `resolvePrice` priority.
    - Sales → inventory deduction using `baseQty`.
    - Edge cases listed in [revised-multi-uom.md](cci:7://file:///d:/project/petshop-management-system/docs/revised-multi-uom.md:0:0-0:0).

- [ ] **ROLLOUT-003 – Staged Enablement**
  - Enable `enableMultiUomPricing` in staging first.
  - Test:
    - Single-UOM product.
    - Multi-UOM single category.
    - Multi-UOM multi-category + store overrides.
  - Gradually enable in production per store.
