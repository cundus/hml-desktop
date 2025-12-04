# Ultimate Final Task Tracker - Petshop Management System

## 🎯 **Phase 1: Critical Foundation** (Unblocks All Other Features)

### **Architecture & Infrastructure**
| ID | Task | Priority | Status | Effort | Dependencies | Acceptance Criteria |
|----|------|----------|--------|--------|--------------|-------------------|
| ARCH-001 | **Cloud Sync Flow** - Manual sync button, push local changes, conflict handling | CRITICAL | ⬜ TODO | XL | None | Manual sync works, changes push/pull, basic conflicts resolved |
| ARCH-002 | **Branch/Store Filtering** - Apply store_id filtering across all services | CRITICAL | ⬜ TODO | L | ARCH-001 | All queries filtered by store, data isolation confirmed |
| ARCH-003 | **Dynamic Access Control** - Full role & permission management system | CRITICAL | ✅ DONE | L | ARCH-002 | SideNav hides items, routes protected, permissions enforced |
| ARCH-004 | **App Configuration System** - First-time setup, branch selection, cloud DB validation | CRITICAL | ⬜ TODO | M | ARCH-001 | Setup wizard works, branch info saved, cloud DB validates |

---

## 💰 **Phase 2: Core Sales & Cashier** (Revenue Impact)

### **Enhanced Sales Workflow**
| ID | Task | Priority | Status | Effort | Dependencies | Acceptance Criteria |
|----|------|----------|--------|--------|--------------|-------------------|
| SALES-001 | **Product Selection Modal** - UOM → Price Category → Quantity flow | HIGH | ✅ DONE | M | ARCH-003 | Modal opens, selections work, items added to cart correctly |
| SALES-002 | **Full Hotkey Navigation** - Arrow keys, F1-F12 UOM, Alt+1-0 price, Tab cycling | HIGH | ✅ DONE | M | SALES-001 | All hotkeys work, intuitive navigation, no conflicts |
| SALES-003 | **Currency Formatting** - Remove .00 decimals, centralized utility | HIGH | ✅ DONE | S | None | All currency shows no decimals, utility function used everywhere |
| SALES-004 | **Customer Purchase History** - Show last price + date for wholesale customers | HIGH | ⬜ TODO | M | ARCH-002 | History displays for wholesale, shows price and date |
| SALES-005 | **Payment Method Popup** - Cash, Card, QRIS, Credit with deadline for credit | HIGH | ⬜ TODO | M | SALES-001 | All methods work, credit requires deadline input |

### **Delivery System**
| ID | Task | Priority | Status | Effort | Dependencies | Acceptance Criteria |
|----|------|----------|--------|--------|--------------|-------------------|
| DELIV-001 | **Transaction Types** - Take Away / Delivery selection | HIGH | ⬜ TODO | S | SALES-001 | Type selection works, affects checkout flow |
| DELIV-002 | **Delivery Workflow** - Courier input, shipping fees, "Belum Terkirim" dashboard | HIGH | ⬜ TODO | M | DELIV-001 | Courier/fees saved, undelivered list shows correctly |

---

## 📦 **Phase 3: Inventory & Pricing** (Operational Excellence)

### **Advanced Inventory Management**
| ID | Task | Priority | Status | Dependencies |
|----|------|----------|--------|--------------|
| INV-001 | **Stock Opname Backend** - Role-authorized, branch-specific, sync to cloud | HIGH | ⬜ TODO | ARCH-001, ARCH-002 |
| INV-002 | **Stock Alerts System** - Zero stock alerts, supplier out-of-stock reminders | MEDIUM | ⬜ TODO | INV-001 |
| INV-003 | **Batch Management** - Track product batches with expiry dates | MEDIUM | ⬜ TODO | ARCH-002 |

### **Dynamic Pricing & Promotions**
| ID | Task | Priority | Status | Dependencies |
|----|------|----------|--------|--------------|
| PRICE-001 | **Warehouse/HQ Pricing** - Centralized pricing control, per-UOM pricing | HIGH | ⬜ TODO | ARCH-001 |
| PRICE-002 | **Dynamic Promotions** - Product-specific, nominal/percentage, customer categories | HIGH | ⬜ TODO | PRICE-001 |
| PRICE-003 | **Commission System** - Per-product, nominal/margin, branch-specific | HIGH | ⬜ TODO | PRICE-001 |

---

## 📊 **Phase 4: Financial Management** (Business Intelligence)

### **Shift & Settlement**
| ID | Task | Priority | Status | Dependencies |
|----|------|----------|--------|--------------|
| SHIFT-001 | **Enhanced Shift Closing** - Total sales, net sales, expected cash, expenses | HIGH | ⬜ TODO | SALES-005 |
| SHIFT-002 | **Settlement Printout** - Auto-sync, turnover by payment method, creditors list | HIGH | ⬜ TODO | SHIFT-001 |

### **Expense & Financial Tracking**
| ID | Task | Priority | Status | Dependencies |
|----|------|----------|--------|--------------|
| FIN-001 | **Daily Expense Menu** - Item, qty, price, total, description (cash-only) | HIGH | ⬜ TODO | ARCH-003 |
| FIN-002 | **Target Revenue System** - Per-branch & per-product targets, deadline config | MEDIUM | ⬜ TODO | SHIFT-001 |

---

## 🔔 **Phase 5: Operations & Management** (Process Optimization)

### **Todo & Task Management**
| ID | Task | Priority | Status | Dependencies |
|----|------|----------|--------|--------------|
| OPS-001 | **Employee Todo System** - Create, assign, recurring tasks, login popup reminders | MEDIUM | ⬜ TODO | ARCH-003 |
| OPS-002 | **User Profiles** - Detailed employee information pages | LOW | ⬜ TODO | ARCH-003 |

### **Purchasing Enhancement**
| ID | Task | Priority | Status | Dependencies |
|----|------|----------|--------|--------------|
| PURCH-001 | **Advanced Purchasing** - Autocomplete dropdown, order details, dedicated tab | MEDIUM | ⬜ TODO | ARCH-002 |

---

## 📈 **Phase 6: Reports & Analytics** (Business Insights)

### **Comprehensive Reporting**
| ID | Task | Priority | Status | Dependencies |
|----|------|----------|--------|--------------|
| REPORT-001 | **PDF Export System** - Consistent PDF generation across all reports | HIGH | ⬜ TODO | SHIFT-002 |
| REPORT-002 | **Sales Analytics** - Revenue comparison, monthly reports | MEDIUM | ⬜ TODO | REPORT-001 |
| REPORT-003 | **Supplier Reports** - Total purchases, payables status, historical invoices | MEDIUM | ⬜ TODO | REPORT-001 |
| REPORT-004 | **Receivables Management** - Customer debt tracking, popup reminders | MEDIUM | ⬜ TODO | FIN-001 |

---

## 🐛 **Phase 7: Quality & Polish** (Stability & UX)

### **Bug Fixes & UX Polish**
| ID | Task | Priority | Status | Dependencies |
|----|------|----------|--------|--------------|
| POLISH-001 | **Delete Store Bug** - Fix store deletion functionality | MEDIUM | ⬜ TODO | None |
| POLISH-002 | **Multi-Printer Support** - Support for multiple receipt printers | MEDIUM | ⬜ TODO | SALES-001 |
| POLISH-003 | **Transaction Receipt Editing** - Allow editing of printed receipts | MEDIUM | ⬜ TODO | REPORT-001 |

---

## � **Effort Estimation Legend**

| Effort | Estimated Days | Description |
|--------|----------------|-------------|
| **S** | 1-2 days | Small changes, single component |
| **M** | 3-5 days | Medium complexity, multiple components |
| **L** | 1-2 weeks | Large feature, new database tables |
| **XL** | 2-3 weeks | Very large, architectural changes |

## �📋 **Task Summary by Priority & Effort**

| Priority | Count | Total Effort | Status |
|----------|-------|--------------|--------|
| **CRITICAL** | 4 tasks | 1XL + 1L + 2M | 1 IN PROGRESS, 3 TODO |
| **HIGH** | 15 tasks | 2XL + 4L + 9M | 3 DONE, 12 TODO |
| **MEDIUM** | 10 tasks | 1L + 9M | 10 TODO |
| **LOW** | 1 task | 1M | 1 TODO |
| **TOTAL** | **30 tasks** | **~13-14 weeks** | **3 DONE, 1 IN PROGRESS, 26 TODO** |

---

## 🚀 **Recommended Development Sequence**

1. **Week 1-2**: Complete ARCH-001 to ARCH-004 (Foundation)
2. **Week 3-4**: SALES-001 to SALES-005 + DELIV-001/002 (Core Revenue)
3. **Week 5-6**: INV-001 to INV-003 + PRICE-001 to PRICE-003 (Inventory)
4. **Week 7-8**: SHIFT-001/002 + FIN-001/002 (Financial)
5. **Week 9-10**: OPS-001/002 + PURCH-001 (Operations)
6. **Week 11-12**: REPORT-001 to REPORT-004 (Analytics)
7. **Week 13**: POLISH-001 to POLISH-003 (Quality)

**Total Estimated: 13 weeks**

---

## ✅ **Recently Completed (Last Session)**

- ✅ SALES-001: Product selection modal with UOM/price/quantity
- ✅ SALES-002: Full keyboard navigation system
- ✅ SALES-003: Currency formatting utility
- ✅ ARCH-003: SideNav reorganization with proper permissions
- ✅ Database permission reset implemented

---

## 📝 **Notes & Dependencies**

### **Critical Path Dependencies**
- **ARCH-001 (Cloud Sync)** must be completed before most features can work properly
- **ARCH-002 (Branch Filtering)** is required for all multi-branch functionality
- **ARCH-003 (Access Control)** enables proper role-based feature access

### **Database Changes Required**
- New tables: Promotion, RevenueTarget, DeliveryTracking, StockOpname, TodoList, Expense, Commission
- Modified tables: User (profile), Transaction (delivery, promo, commission), Product (HQ pricing, multi-UoM)

### **Technical Considerations**
- PDF Export: Consider using `jspdf` or `pdfmake` for consistent generation
- Alerts System: May require background service for scheduled reminders
- FIFO Logic: Required for cost price changes affecting selling prices

---

## 🏷️ **Legend**

- ⬜ TODO - Not started
- 🔄 IN PROGRESS - Currently working
- ✅ DONE - Completed
- ❌ BLOCKED - Blocked by dependency

---

*Last Updated: December 4, 2025*
*Consolidated from: development-plan.md, development-plan-v2.md, next-tasks.md, user-request.txt*
