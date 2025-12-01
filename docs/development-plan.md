# Development Plan - Petshop Management System

## Overview

This document outlines the structured development plan based on client requirements. Tasks are organized by priority and grouped into development phases.

---

## Phase 1: Core Fixes & UX Improvements (Priority: HIGH)

### 1.1 Bug Fixes
| ID | Task | Status | Complexity |
|----|------|--------|------------|
| BUG-001 | Fix "Tambah Pelanggan" (Add Customer) feature issues | ✅ DONE | Medium |

### 1.2 UI/UX Enhancements
| ID | Task | Status | Complexity |
|----|------|--------|------------|
| UX-001 | Auto-fullscreen on app launch | ✅ DONE | Low |
| UX-002 | Display date, day, time on top-right corner | ✅ DONE | Low |
| UX-003 | Display username + role on top-left corner | ✅ DONE | Low |
| UX-004 | Auto-focus & auto-type on "Add Product" modal (F2 shortcut) | ✅ DONE | Medium |

---

## Phase 2: Product & Supplier Management (Priority: HIGH)

### 2.1 Product Enhancements
| ID | Task | Status | Complexity |
|----|------|--------|------------|
| PROD-001 | Add product category labels | ⬜ TODO | Low |
| PROD-002 | Add supplier labels | ⬜ TODO | Low |
| PROD-003 | Add default units: PCS, SAK, BOX, DUS, PACK (extendable) | ⬜ TODO | Medium |
| PROD-004 | Separate product vs service in reports | ⬜ TODO | Medium |

### 2.2 Pricing Tab
| ID | Task | Status | Complexity |
|----|------|--------|------------|
| PRICE-001 | Display cost price (harga modal) & selling price (harga jual) | ⬜ TODO | Low |
| PRICE-002 | Auto-calculate margin from prices | ⬜ TODO | Low |
| PRICE-003 | Auto-update selling price when margin % is manually entered | ⬜ TODO | Medium |

### 2.3 Commission System
| ID | Task | Status | Complexity |
|----|------|--------|------------|
| COMM-001 | Add commission per product feature | ⬜ TODO | Medium |
| COMM-002 | Create commission settings tab with conditions | ⬜ TODO | High |

---

## Phase 3: Cashier & Shift Management (Priority: HIGH)

### 3.1 Shift System
| ID | Task | Status | Complexity |
|----|------|--------|------------|
| SHIFT-001 | Require initial cash input on cashier login | ⬜ TODO | Medium |
| SHIFT-002 | End shift: require cash-on-hand input, auto-calculate difference | ⬜ TODO | Medium |
| SHIFT-003 | Add confirmation popup "Are you sure you want to end shift?" | ⬜ TODO | Low |
| SHIFT-004 | Settlement / Close Cashier feature | ⬜ TODO | High |

### 3.2 Backup Cashier System
| ID | Task | Status | Complexity |
|----|------|--------|------------|
| BACKUP-001 | Backup cashier must re-login (username + PIN) | ⬜ TODO | Medium |
| BACKUP-002 | Store shift history (who worked each shift) | ⬜ TODO | Medium |
| BACKUP-003 | Add PIN feature (in addition to ID & Password) | ⬜ TODO | Medium |

---

## Phase 4: Sales & Purchasing (Priority: MEDIUM)

### 4.1 Sales Enhancements
| ID | Task | Status | Complexity |
|----|------|--------|------------|
| SALES-001 | Add "Expense Report" tab (daily cash out recap) | ⬜ TODO | Medium |
| SALES-002 | Print & Export PDF for reports and summaries | ⬜ TODO | High |

### 4.2 Purchasing Improvements
| ID | Task | Status | Complexity |
|----|------|--------|------------|
| PURCH-001 | Autocomplete dropdown on Purchasing | ⬜ TODO | Medium |
| PURCH-002 | Display order details | ⬜ TODO | Low |
| PURCH-003 | Add dedicated Purchasing tab | ⬜ TODO | Medium |

---

## Phase 5: Delivery System (Priority: MEDIUM)

| ID | Task | Status | Complexity |
|----|------|--------|------------|
| DELIV-001 | Add transaction type: Take Away / Delivery | ⬜ TODO | Medium |
| DELIV-002 | For Delivery: input courier name | ⬜ TODO | Low |
| DELIV-003 | For Delivery: input shipping cost → include in delivery report | ⬜ TODO | Medium |

---

## Phase 6: Dashboard Alerts & Notifications (Priority: MEDIUM)

### 6.1 Stock Alerts
| ID | Task | Status | Complexity |
|----|------|--------|------------|
| ALERT-001 | Stock = 0 clickable alert with action options | ⬜ TODO | Medium |
| ALERT-002 | Action: "Product discontinued" → reminder every 7 days | ⬜ TODO | Medium |
| ALERT-003 | Action: "Out of stock from supplier" → reminder every 3 hours | ⬜ TODO | Medium |
| ALERT-004 | Export all out-of-stock products to PDF for owner | ⬜ TODO | Medium |

### 6.2 Receivables Alerts
| ID | Task | Status | Complexity |
|----|------|--------|------------|
| ALERT-005 | Customer receivables popup reminder every 3-4 hours | ⬜ TODO | Medium |
| ALERT-006 | Export receivables summary to PDF | ⬜ TODO | Medium |

---

## Phase 7: Reports & Analytics (Priority: MEDIUM)

### 7.1 General Reports
| ID | Task | Status | Complexity |
|----|------|--------|------------|
| REPORT-001 | Add "Reports" / "Summary" tab | ⬜ TODO | Medium |
| REPORT-002 | Revenue comparison: compare with last month or specific month | ⬜ TODO | High |

### 7.2 Supplier Summary
| ID | Task | Status | Complexity |
|----|------|--------|------------|
| REPORT-003 | Total purchases per supplier | ⬜ TODO | Medium |
| REPORT-004 | Payables status to supplier (if any) | ⬜ TODO | Medium |
| REPORT-005 | Display historical invoices & unpaid invoices | ⬜ TODO | High |

---

## Database Schema Changes Required

### New Tables/Models
```
- CashierShift (shift management, initial cash, closing cash)
- ShiftHistory (backup cashier tracking)
- ProductCommission (commission per product)
- CommissionCondition (commission rules)
- Expense (daily expense tracking)
- DeliveryInfo (courier, shipping cost)
- StockAlert (alert settings per product)
- AlertReminder (reminder schedule)
```

### Model Modifications
```
- User: add PIN field
- Product: add isService flag, commissionId
- Transaction: add transactionType (DINE_IN, TAKE_AWAY, DELIVERY)
- Transaction: add deliveryInfoId (optional)
```

---

## Development Timeline (Suggested)

| Phase | Duration | Priority |
|-------|----------|----------|
| Phase 1: Core Fixes & UX | 1 week | HIGH |
| Phase 2: Product & Supplier | 1-2 weeks | HIGH |
| Phase 3: Cashier & Shift | 2 weeks | HIGH |
| Phase 4: Sales & Purchasing | 1-2 weeks | MEDIUM |
| Phase 5: Delivery System | 1 week | MEDIUM |
| Phase 6: Dashboard Alerts | 1-2 weeks | MEDIUM |
| Phase 7: Reports & Analytics | 2 weeks | MEDIUM |

**Total Estimated: 9-12 weeks**

---

## Task Summary

| Priority | Count | Status |
|----------|-------|--------|
| HIGH | 19 tasks | ⬜ TODO |
| MEDIUM | 18 tasks | ⬜ TODO |
| **Total** | **37 tasks** | |

---

## Notes

1. **Dependencies**: Phase 3 (Shift Management) should be completed before Phase 4 (Sales) for proper integration.
2. **PDF Export**: Consider using a library like `jspdf` or `pdfmake` for consistent PDF generation across all features.
3. **Alerts System**: May require a background service or scheduled tasks for reminders.
4. **Testing**: Each phase should include testing before moving to the next.

---

## Legend

- ⬜ TODO - Not started
- 🔄 IN PROGRESS - Currently working
- ✅ DONE - Completed
- ❌ BLOCKED - Blocked by dependency
