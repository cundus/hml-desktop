# Development Plan – Petshop Management System (Updated)

This is the **cleaned and expanded development plan** based on the complete requirements you provided. All items are structured into phases, matching the format of your existing development plan while extending it with new modules such as Promotions, Dynamic Pricing, Warehouse HQ, Advanced Cashier Workflow, Target Revenue, Stock Opname Backend, Todo List, Delivery Flow, and more.

---

## Phase 1: Sales Page Enhancements (Priority: HIGH)

### 1.1 Customer Requirements

| ID             | Task                                                                                        | Status  | Complexity |
| -------------- | ------------------------------------------------------------------------------------------- | ------- | ---------- |
| SALES-CUST-001 | Show brief purchase history for wholesale customers                                         | ⬜ TODO | Medium     |
| SALES-CUST-002 | Display previous price + last purchase date if wholesale customer bought the product before | ⬜ TODO | Medium     |

### 1.2 Product Flow Enhancements

| ID             | Task                                                         | Status  | Complexity |
| -------------- | ------------------------------------------------------------ | ------- | ---------- |
| SALES-PROD-001 | After selecting product → choose price category → choose UoM | ⬜ TODO | Medium     |
| SALES-PROD-002 | Ask default price category                                   | ⬜ TODO | Medium     |

---

## Phase 2: Cashier System Upgrade (Priority: HIGH)

### 2.1 Main Cashier Workflow

| ID          | Task                                                              | Status  | Complexity |
| ----------- | ----------------------------------------------------------------- | ------- | ---------- |
| CASHIER-001 | Product selection popup → choose UoM → choose price → input qty   | ⬜ TODO | High       |
| CASHIER-002 | Full hotkey UX (arrow selection, auto numeric input)              | ⬜ TODO | High       |
| CASHIER-003 | Remove decimal tailing zeroes                                     | ⬜ TODO | Low        |
| CASHIER-004 | Multi‑printer support                                             | ⬜ TODO | Medium     |
| CASHIER-005 | Delivery type selection (Take Away / Delivery)                    | ⬜ TODO | Medium     |
| CASHIER-006 | Delivery: input shipping fee + assign courier (optional)          | ⬜ TODO | Medium     |
| CASHIER-007 | Delivery orders without courier → "Belum Terkirim" dashboard list | ⬜ TODO | Medium     |
| CASHIER-008 | Future: Driver pickup → customer received proof                   | ⬜ TODO | Low        |
| CASHIER-009 | Edit transaction receipt (nota)                                   | ⬜ TODO | Medium     |

### 2.2 Payment Workflow

| ID          | Task                                            | Status  | Complexity |
| ----------- | ----------------------------------------------- | ------- | ---------- |
| PAYMENT-001 | Payment method popup (Cash, Card, QRIS, Credit) | ⬜ TODO | Medium     |
| PAYMENT-002 | Credit payments require deadline                | ⬜ TODO | Medium     |

---

## Phase 3: Shift Closing & Settlement (Priority: HIGH)

### 3.1 Shift Summary Enhancements

| ID        | Task                                                         | Status  | Complexity |
| --------- | ------------------------------------------------------------ | ------- | ---------- |
| SHIFT-005 | Updated shift summary: total sales, net sales, expected cash | ⬜ TODO | Medium     |
| SHIFT-006 | Expense input during shift closing                           | ⬜ TODO | Medium     |

### 3.2 Settlement Printout

| ID         | Task                                  | Status  | Complexity |
| ---------- | ------------------------------------- | ------- | ---------- |
| SETTLE-001 | Print settlement (auto-sync)          | ⬜ TODO | High       |
| SETTLE-002 | Include total turnover (omset)        | ⬜ TODO | Low        |
| SETTLE-003 | Categorise income by payment method   | ⬜ TODO | Medium     |
| SETTLE-004 | List all creditors (hutang pelanggan) | ⬜ TODO | Medium     |
| SETTLE-005 | Show difference (selisih)             | ⬜ TODO | Medium     |
| SETTLE-006 | Cash on hand start & end              | ⬜ TODO | Low        |
| SETTLE-007 | Daily expenses breakdown              | ⬜ TODO | Medium     |
| SETTLE-008 | Amount that must be deposited         | ⬜ TODO | Medium     |
| SETTLE-009 | Cashier identity who closed shift     | ⬜ TODO | Low        |

---

## Phase 4: Dynamic Access Control (Priority: HIGH)

| ID         | Task                                              | Status  | Complexity |
| ---------- | ------------------------------------------------- | ------- | ---------- |
| ACCESS-001 | Create fully dynamic role & permission management | ⬜ TODO | High       |

---

## Phase 5: Dynamic Promotions System (Priority: HIGH)

| ID        | Task                                                        | Status  | Complexity |
| --------- | ----------------------------------------------------------- | ------- | ---------- |
| PROMO-001 | Create dynamic promotion module                             | ⬜ TODO | High       |
| PROMO-002 | Promotions per product                                      | ⬜ TODO | Medium     |
| PROMO-003 | Promo input types: nominal / margin‑percentage              | ⬜ TODO | Medium     |
| PROMO-004 | Applicable to specific customer categories or all customers | ⬜ TODO | Medium     |
| PROMO-005 | Select applicable branches                                  | ⬜ TODO | Medium     |
| PROMO-006 | Set validity period                                         | ⬜ TODO | Medium     |

---

## Phase 6: Target Revenue (Omset) System (Priority: MEDIUM)

| ID         | Task                                        | Status  | Complexity |
| ---------- | ------------------------------------------- | ------- | ---------- |
| TARGET-001 | Omset targets per branch                    | ⬜ TODO | Medium     |
| TARGET-002 | Omset targets per product                   | ⬜ TODO | Medium     |
| TARGET-003 | Show target progress in shift closing popup | ⬜ TODO | Medium     |
| TARGET-004 | Target deadline configuration               | ⬜ TODO | Low        |

---

## Phase 7: User Management (Priority: MEDIUM)

| ID       | Task                           | Status  | Complexity |
| -------- | ------------------------------ | ------- | ---------- |
| USER-001 | Detailed employee profile page | ⬜ TODO | Low        |

---

## Phase 8: Stock Opname Backend (Priority: HIGH)

| ID       | Task                                             | Status  | Complexity |
| -------- | ------------------------------------------------ | ------- | ---------- |
| STOK-001 | Stock opname assignable only by authorised roles | ⬜ TODO | Medium     |
| STOK-002 | Must choose branch                               | ⬜ TODO | Medium     |
| STOK-003 | Select products or "ALL"                         | ⬜ TODO | Medium     |
| STOK-004 | Sync opname to web + branch app                  | ⬜ TODO | High       |
| STOK-005 | Prompt stock adjustment after completion         | ⬜ TODO | High       |

---

## Phase 9: App Configuration System (Priority: HIGH)

| ID       | Task                                        | Status  | Complexity |
| -------- | ------------------------------------------- | ------- | ---------- |
| CONF-004 | First‑time setup: branch + head branch      | ⬜ TODO | High       |
| CONF-005 | Local device stores branch info for app bar | ⬜ TODO | Medium     |
| CONF-006 | Insert cloud DB after setup                 | ⬜ TODO | Medium     |

---

## Phase 10: Warehouse / HQ Pricing System (Priority: HIGH)

| ID           | Task                                                             | Status  | Complexity |
| ------------ | ---------------------------------------------------------------- | ------- | ---------- |
| WH-PRICE-001 | HQ-controlled pricing                                            | ⬜ TODO | High       |
| WH-PRICE-002 | Pricing per UoM                                                  | ⬜ TODO | Medium     |
| WH-PRICE-003 | Cost price change → auto calculate selling price (FIFO required) | ⬜ TODO | High       |
| WH-PRICE-004 | Sales bonus (commission) per product                             | ⬜ TODO | Medium     |
| WH-PRICE-005 | Commission input: nominal / margin percentage                    | ⬜ TODO | Medium     |
| WH-PRICE-006 | Applicable to categories or all                                  | ⬜ TODO | Medium     |
| WH-PRICE-007 | Select branches                                                  | ⬜ TODO | Medium     |
| WH-PRICE-008 | Set validity period                                              | ⬜ TODO | Medium     |

---

## Phase 11: Todo List System (Priority: HIGH)

| ID       | Task                               | Status  | Complexity |
| -------- | ---------------------------------- | ------- | ---------- |
| TODO-001 | Todo created by top-level users    | ⬜ TODO | Medium     |
| TODO-002 | Assign todo to employees           | ⬜ TODO | Medium     |
| TODO-003 | Todo button in app bar             | ⬜ TODO | Low        |
| TODO-004 | Login popup if pending todos exist | ⬜ TODO | Medium     |
| TODO-005 | Staff checklist system             | ⬜ TODO | Medium     |
| TODO-006 | Daily recurring todos              | ⬜ TODO | Medium     |
| TODO-007 | Creator can update todo items      | ⬜ TODO | Low        |

---

## Phase 12: Expense Menu (Priority: MEDIUM)

| ID      | Task                                                      | Status  | Complexity |
| ------- | --------------------------------------------------------- | ------- | ---------- |
| EXP-001 | Expense fields: item name, qty, price, total, description | ⬜ TODO | Medium     |
| EXP-002 | Expenses must be cash-only                                | ⬜ TODO | Low        |

---

## Phase 13: Bugs

| ID      | Bug              | Status  | Complexity |
| ------- | ---------------- | ------- | ---------- |
| BUG-002 | Delete store bug | ⬜ TODO | Medium     |

---

## Database Changes Summary

### **New Models Required**

```
Promotion
PromotionBranch
PromotionCustomerCategory
RevenueTarget
DeliveryTracking
StockOpname
StockOpnameItem
TodoList
TodoAssignment
Expense
Commission
CommissionRule
WarehousePricing
```

### **Existing Models to Modify**

```
User → extend profile
Transaction → add delivery, promo, commission
Product → link HQ pricing, multi‑UoM
```
