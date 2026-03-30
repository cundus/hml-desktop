# Product Requirements Document (PRD)
# Petshop Management System - Next.js Web Application

**Versi**: 1.0  
**Tanggal**: 1 Maret 2026  
**Status**: Draft untuk Rewrite dari Electron Desktop ke Next.js Web

---

## 1. Executive Summary

### 1.1 Ringkasan Proyek Saat Ini

**Petshop Management System** adalah aplikasi desktop berbasis Electron yang dibangun dengan React 19, TypeScript, dan Material UI v7. Aplikasi ini mengelola operasional toko petshop dengan fitur lengkap meliputi:

- Point of Sale (POS) / Kasir
- Manajemen Inventory & Stok
- Purchasing & Supplier Management
- Multi-store/Branch Management
- Cloud Sync dengan PostgreSQL
- Offline-first dengan SQLite lokal
- Role-based Access Control (RBAC)
- Shift Management & Settlement
- Multi-UOM (Unit of Measure) & Multi-pricing
- Delivery Order Management
- Financial Reporting

### 1.2 Tujuan Rewrite ke Next.js

**Alasan Strategis**:
1. **Aksesibilitas**: Web-based lebih mudah diakses dari berbagai device tanpa instalasi
2. **Deployment**: Lebih mudah update dan maintenance (no app distribution)
3. **Cross-platform**: Native support untuk mobile, tablet, desktop
4. **Scalability**: Lebih mudah scale dengan cloud infrastructure
5. **Cost**: Tidak perlu manage desktop app updates & distribution
6. **Collaboration**: Multi-user real-time collaboration lebih mudah
7. **Modern Stack**: Next.js 15+ dengan App Router, Server Components, Server Actions

---

## 2. Arsitektur Teknis

### 2.1 Tech Stack Saat Ini (Electron)

```
┌─────────────────────────────────────────┐
│         Renderer Process (React)         │
│   React 19 + MUI v7 + React Router      │
└──────────────┬──────────────────────────┘
               │ IPC (contextBridge)
┌──────────────▼──────────────────────────┐
│          Main Process (Node.js)          │
│    Controllers → Services → DB           │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼────┐         ┌──────▼──────┐
│ SQLite │         │ PostgreSQL  │
│ (Local)│         │   (Cloud)   │
└────────┘         └─────────────┘
```

**Dependencies Utama**:
- Electron + electron-vite
- React 19 + TypeScript
- Material UI v7
- Drizzle ORM
- sql.js (SQLite WASM)
- pg (PostgreSQL driver)
- react-hook-form + zod
- axios

### 2.2 Tech Stack Target (Next.js)

```
┌─────────────────────────────────────────┐
│         Next.js 15+ App Router           │
│   Server Components + Client Components  │
│   React 19 + TypeScript + Tailwind/MUI  │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Server Actions / API Routes      │
│    Business Logic + Authentication       │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         PostgreSQL (Primary DB)          │
│   Drizzle ORM / Prisma + Redis Cache    │
└──────────────────────────────────────────┘
```

**Recommended Stack**:
- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL (Supabase / Neon / Railway)
- **ORM**: Drizzle ORM (maintain compatibility) atau Prisma
- **Auth**: NextAuth.js v5 / Clerk / Supabase Auth
- **UI**: Material UI v7 (maintain consistency) atau shadcn/ui + Tailwind
- **Forms**: react-hook-form + zod (maintain)
- **State**: Zustand / Jotai (lightweight) atau React Context
- **Cache**: Redis (Upstash) untuk session & real-time data
- **Real-time**: Supabase Realtime / Pusher / Socket.io
- **File Storage**: Supabase Storage / AWS S3 / Cloudflare R2
- **Deployment**: Vercel / Railway / Fly.io

---

## 3. Database Schema

### 3.1 Tabel Utama (37 Tables)

**Master Data** (9 tables):
1. `category` - Kategori produk
2. `supplier` - Data supplier
3. `store` - Cabang/toko
4. `customer_category` - Kategori pelanggan
5. `customer` - Data pelanggan
6. `uom` - Unit of Measure (satuan)
7. `price_category` - Kategori harga (retail, grosir, dll)
8. `payment_method` - Metode pembayaran
9. `sales_person` - Data sales/marketing

**User Management** (5 tables):
10. `user` - Data user/karyawan
11. `role` - Role/jabatan
12. `permission` - Daftar permission
13. `user_role` - Relasi user-role (many-to-many)
14. `role_permission` - Relasi role-permission (many-to-many)

**Product Management** (5 tables):
15. `product` - Master produk
16. `product_uom` - UOM per produk dengan conversion factor
17. `product_price` - Harga per store (deprecated, diganti pricing baru)
18. `product_uom_category_price` - Harga per UOM per kategori harga (HQ)
19. `store_product_uom_price` - Override harga per store (opsional)

**Inventory** (4 tables):
20. `product_location` - Stok per produk per store
21. `batch` - Batch produk dengan expiry date
22. `stock_transaction` - History transaksi stok
23. `stock_adjustment` - Penyesuaian stok (stock opname)

**Sales/POS** (3 tables):
24. `transactions` - Transaksi penjualan
25. `transaction_items` - Detail item transaksi
26. `delivery_order` - Surat jalan pengiriman

**Purchasing** (2 tables):
27. `purchase_order` - Purchase order
28. `purchase_order_item` - Detail item PO

**Finance** (3 tables):
29. `cashier_shift` - Shift kasir
30. `expenses` - Pengeluaran per shift
31. `shift_history` - History aksi shift

**HR/Payroll** (6 tables):
32. `employee` - Data karyawan
33. `work_schedule` - Jadwal kerja
34. `employee_schedule` - Assignment jadwal ke karyawan
35. `attendance` - Absensi
36. `salary_component` - Komponen gaji
37. `employee_salary_component` - Gaji per karyawan

**System** (2 tables):
38. `audit_log` - Log aktivitas user
39. `printer_config` - Konfigurasi printer (local, bisa jadi app config)

### 3.2 Perubahan Schema untuk Web

**Tambahan untuk Web**:
- `session` - User sessions (NextAuth)
- `verification_token` - Email/phone verification
- `password_reset_token` - Reset password tokens
- `api_key` - API keys untuk integrasi
- `webhook_log` - Webhook event logs
- `notification` - In-app notifications
- `activity_feed` - Activity stream untuk dashboard

**Hapus/Modifikasi**:
- `device_id` field → tidak relevan untuk web (ganti dengan `session_id` atau `ip_address`)
- `synced_at` field → tidak perlu (single source of truth di cloud)
- SQLite lokal → full cloud PostgreSQL

---

## 4. Fitur Fungsional

### 4.1 Modul Inti (Sudah Ada)

#### A. Authentication & Authorization
- ✅ Login dengan email/password
- ✅ PIN login untuk kasir
- ✅ Role-based access control (RBAC)
- ✅ Dynamic permissions
- 🆕 Multi-factor authentication (MFA)
- 🆕 Social login (Google, Microsoft)
- 🆕 Password reset via email
- 🆕 Session management

#### B. Dashboard
- ✅ Sales summary (hari ini, bulan ini)
- ✅ Top products
- ✅ Low stock alerts
- ✅ Recent transactions
- 🆕 Real-time updates
- 🆕 Customizable widgets
- 🆕 Multi-store comparison
- 🆕 Revenue targets & progress

#### C. Point of Sale (POS/Kasir)
- ✅ Product selection dengan barcode scanner
- ✅ Multi-UOM selection
- ✅ Multi-price category
- ✅ Customer selection
- ✅ Discount (nominal/percentage)
- ✅ Multiple payment methods
- ✅ Credit payment dengan deadline
- ✅ Receipt printing
- ✅ Sales person assignment
- 🆕 Delivery type (Take Away / Delivery)
- 🆕 Shipping fee & courier assignment
- 🆕 Edit transaction (nota)
- 🆕 Hotkey support (keyboard shortcuts)
- 🆕 Touch-optimized UI untuk tablet
- 🆕 Split payment (multiple methods)
- 🆕 Customer purchase history popup
- 🆕 Previous price display untuk repeat customer

#### D. Inventory Management
- ✅ Product CRUD
- ✅ Multi-UOM dengan conversion factor
- ✅ Batch tracking dengan expiry date
- ✅ Stock per location/store
- ✅ Stock adjustment
- ✅ Stock transaction history
- ✅ Low stock alerts
- 🆕 Stock opname (assignable by role)
- 🆕 Auto stock adjustment after opname
- 🆕 Expiring products report
- 🆕 Stock movement report
- 🆕 FIFO costing

#### E. Pricing Management
- ✅ Multi-price category (retail, grosir, dll)
- ✅ Price per UOM per category
- ✅ Store-specific price override
- 🆕 HQ-controlled pricing
- 🆕 Auto price calculation from cost (margin-based)
- 🆕 Bulk price update
- 🆕 Price history tracking
- 🆕 Dynamic promotions system
- 🆕 Commission/bonus per product

#### F. Purchasing
- ✅ Purchase Order (PO) management
- ✅ PO status workflow (DRAFT → ORDERED → RECEIVED)
- ✅ Supplier management
- 🆕 PO approval workflow
- 🆕 Receiving with batch assignment
- 🆕 Purchase return
- 🆕 Supplier performance report

#### G. Customer Management
- ✅ Customer CRUD
- ✅ Customer categories
- ✅ Customer address
- 🆕 Customer purchase history
- 🆕 Customer credit limit
- 🆕 Customer loyalty points
- 🆕 Customer segmentation

#### H. Shift Management
- ✅ Open/close shift
- ✅ Initial cash
- ✅ Shift summary (sales, expenses, cash)
- ✅ Settlement printout
- 🆕 Expense input during shift
- 🆕 Cash difference tracking
- 🆕 Multi-cashier per shift
- 🆕 Shift handover notes

#### I. Reporting
- ✅ Sales report
- ✅ Profit/loss report
- ✅ Stock report
- ✅ Transaction history
- 🆕 Financial dashboard
- 🆕 Custom date range
- 🆕 Export to Excel/PDF
- 🆕 Scheduled reports (email)
- 🆕 Multi-store consolidated reports

#### J. Multi-Store/Branch
- ✅ Store management
- ✅ Store type (HQ/Branch)
- ✅ Store-specific inventory
- ✅ Store-specific pricing
- 🆕 Inter-store transfer
- 🆕 Store performance comparison
- 🆕 Centralized HQ dashboard

### 4.2 Fitur Baru (Belum Ada)

#### K. Dynamic Promotions
- Promo per product
- Promo type: nominal discount / margin percentage
- Applicable to: specific customer categories / all
- Branch selection
- Validity period (start/end date)
- Auto-apply at POS

#### L. Revenue Target (Omset)
- Target per branch
- Target per product
- Target deadline
- Progress tracking
- Display in shift closing popup
- Target vs actual comparison

#### M. Delivery Management
- Delivery order creation
- Courier assignment
- Delivery status tracking
- "Belum Terkirim" dashboard
- Driver pickup confirmation
- Customer received proof (signature/photo)
- Shipping fee calculation

#### N. Todo List System
- Todo creation by top-level users
- Assign to employees
- Todo button in app bar
- Login popup if pending todos
- Staff checklist system
- Daily recurring todos
- Todo completion tracking

#### O. Expense Management
- Expense categories
- Expense fields: item, qty, price, total, description
- Cash-only expenses
- Expense per shift
- Expense approval workflow
- Expense report

#### P. HR & Payroll (Future)
- Employee management
- Work schedule
- Attendance tracking
- Salary components
- Payroll calculation
- Payroll period
- Payslip generation

---

## 5. User Roles & Permissions

### 5.1 Role Hierarchy

1. **Super Admin** (HQ)
   - Full access ke semua fitur
   - Manage users, roles, permissions
   - Manage stores/branches
   - View consolidated reports

2. **Store Manager** (Branch)
   - Manage store operations
   - View store reports
   - Manage store staff
   - Approve PO, stock adjustments

3. **Cashier**
   - POS access
   - Open/close shift
   - View own shift reports
   - Basic customer management

4. **Inventory Staff**
   - Product management
   - Stock management
   - Receive PO
   - Stock opname

5. **Sales Person**
   - POS access (limited)
   - Customer management
   - View own sales report

6. **Finance**
   - View all financial reports
   - Manage expenses
   - Approve payments
   - Export reports

### 5.2 Permission Structure

Format: `<domain>.<entity>.<action>`

**Contoh**:
- `dashboard.view`
- `sales.pos.view`, `sales.pos.create`
- `inventory.product.view`, `inventory.product.create`, `inventory.product.update`, `inventory.product.delete`
- `inventory.stock.adjust`
- `purchasing.po.view`, `purchasing.po.create`, `purchasing.po.approve`
- `reports.sales.view`, `reports.financial.view`
- `settings.user.manage`, `settings.role.manage`
- `settings.store.manage`

---

## 6. UI/UX Requirements

### 6.1 Design System

**Maintain dari Electron**:
- Material UI v7 components
- Color scheme & branding
- Typography
- Spacing & layout patterns

**Improvements untuk Web**:
- Responsive design (mobile-first)
- Touch-optimized untuk tablet POS
- Dark mode support
- Accessibility (WCAG 2.1 AA)
- Progressive Web App (PWA) support
- Offline mode dengan service worker

### 6.2 Layout Structure

```
┌─────────────────────────────────────────┐
│  Top Bar: Logo | Branch | User | Notif  │
├──────┬──────────────────────────────────┤
│      │                                   │
│ Side │         Main Content              │
│ Nav  │                                   │
│      │                                   │
│      │                                   │
└──────┴──────────────────────────────────┘
```

**Responsive**:
- Desktop: Side nav + top bar
- Tablet: Collapsible side nav
- Mobile: Bottom nav + hamburger menu

### 6.3 Key Pages

1. **Login** - Email/password, PIN login
2. **Dashboard** - Sales summary, charts, alerts
3. **POS** - Full-screen cashier interface
4. **Products** - Product list, CRUD, pricing
5. **Inventory** - Stock list, adjustments, transfers
6. **Purchasing** - PO list, create PO, receive
7. **Customers** - Customer list, CRUD, history
8. **Sales** - Transaction history, reports
9. **Reports** - Financial, sales, inventory reports
10. **Settings** - Users, roles, stores, config
11. **Shift** - Open/close shift, settlement
12. **Delivery** - Delivery orders, tracking
13. **Todos** - Task list, assignments

---

## 7. Technical Requirements

### 7.1 Performance

- **Page Load**: < 2s (initial), < 500ms (navigation)
- **API Response**: < 200ms (p95)
- **Database Query**: < 100ms (p95)
- **Real-time Updates**: < 1s latency
- **Concurrent Users**: Support 100+ users per instance
- **Uptime**: 99.9% SLA

### 7.2 Security

- **Authentication**: JWT + HTTP-only cookies
- **Authorization**: RBAC dengan permission checks
- **Data Encryption**: TLS 1.3, encrypted at rest
- **Input Validation**: Server-side validation dengan zod
- **SQL Injection**: Parameterized queries (Drizzle/Prisma)
- **XSS Protection**: Content Security Policy (CSP)
- **CSRF Protection**: CSRF tokens
- **Rate Limiting**: API rate limits per user/IP
- **Audit Logging**: All critical actions logged

### 7.3 Scalability

- **Horizontal Scaling**: Stateless app servers
- **Database**: PostgreSQL with read replicas
- **Caching**: Redis untuk session, query cache
- **CDN**: Static assets via CDN
- **Load Balancing**: Auto-scaling dengan load balancer
- **Background Jobs**: Queue system (BullMQ/Inngest)

### 7.4 Monitoring & Observability

- **Error Tracking**: Sentry / Rollbar
- **Performance Monitoring**: Vercel Analytics / New Relic
- **Logging**: Structured logs (Pino/Winston)
- **Metrics**: Prometheus + Grafana
- **Uptime Monitoring**: Pingdom / UptimeRobot
- **Database Monitoring**: PgHero / Datadog

---

## 8. Migration Strategy

### 8.1 Data Migration

**Phase 1: Schema Migration**
1. Export schema dari Drizzle (Electron)
2. Create migration scripts untuk PostgreSQL
3. Test migration dengan sample data
4. Validate data integrity

**Phase 2: Data Export**
1. Export data dari SQLite (per store)
2. Transform data (remove device_id, synced_at)
3. Import ke PostgreSQL
4. Validate data completeness

**Phase 3: Cutover**
1. Freeze Electron app (read-only mode)
2. Final data sync
3. Switch to Next.js app
4. Monitor for issues

### 8.2 User Migration

**Training**:
- User guide documentation
- Video tutorials
- Live training sessions
- Sandbox environment untuk testing

**Rollout**:
- Pilot dengan 1-2 stores
- Gather feedback
- Fix issues
- Gradual rollout ke semua stores

### 8.3 Rollback Plan

- Keep Electron app available (read-only)
- Database backup sebelum cutover
- Rollback script jika ada critical issues
- Communication plan untuk users

---

## 9. Development Phases

### Phase 1: Foundation (4-6 weeks)
- Setup Next.js project
- Database schema migration
- Authentication & authorization
- Basic CRUD untuk master data
- UI component library

### Phase 2: Core Features (8-10 weeks)
- POS/Kasir module
- Inventory management
- Product & pricing management
- Customer management
- Basic reporting

### Phase 3: Advanced Features (6-8 weeks)
- Purchasing module
- Shift management
- Multi-store support
- Advanced reporting
- Delivery management

### Phase 4: New Features (4-6 weeks)
- Dynamic promotions
- Revenue targets
- Todo system
- Expense management
- HR/Payroll (basic)

### Phase 5: Polish & Launch (4-6 weeks)
- Performance optimization
- Security audit
- User testing
- Bug fixes
- Documentation
- Training
- Production deployment

**Total Estimated Time**: 26-36 weeks (6-9 months)

---

## 10. Success Metrics

### 10.1 Technical Metrics
- Page load time < 2s
- API response time < 200ms
- 99.9% uptime
- Zero critical security vulnerabilities
- < 1% error rate

### 10.2 Business Metrics
- User adoption rate > 90%
- User satisfaction score > 4/5
- Transaction processing time reduced by 30%
- Report generation time reduced by 50%
- Support tickets reduced by 40%

### 10.3 User Metrics
- Daily active users (DAU)
- Session duration
- Feature usage rate
- Task completion rate
- User retention rate

---

## 11. Risks & Mitigation

### 11.1 Technical Risks

**Risk**: Data loss during migration
- **Mitigation**: Multiple backups, dry-run migrations, validation scripts

**Risk**: Performance issues dengan banyak concurrent users
- **Mitigation**: Load testing, caching strategy, database optimization

**Risk**: Security vulnerabilities
- **Mitigation**: Security audit, penetration testing, regular updates

### 11.2 Business Risks

**Risk**: User resistance to change
- **Mitigation**: Training, gradual rollout, feedback loop

**Risk**: Downtime during cutover
- **Mitigation**: Maintenance window, rollback plan, communication

**Risk**: Feature parity dengan Electron app
- **Mitigation**: Feature checklist, user acceptance testing

---

## 12. Appendix

### 12.1 API Endpoints (Sample)

```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/session

GET    /api/products
POST   /api/products
GET    /api/products/:id
PUT    /api/products/:id
DELETE /api/products/:id

GET    /api/inventory/stock
POST   /api/inventory/adjust
GET    /api/inventory/transactions

POST   /api/sales/transactions
GET    /api/sales/transactions
GET    /api/sales/transactions/:id

GET    /api/reports/sales
GET    /api/reports/profit-loss
GET    /api/reports/inventory

GET    /api/stores
POST   /api/stores
GET    /api/stores/:id
PUT    /api/stores/:id
```

### 12.2 Environment Variables

```env
# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Auth
NEXTAUTH_URL=https://...
NEXTAUTH_SECRET=...

# Storage
S3_BUCKET=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...

# Email
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...

# Monitoring
SENTRY_DSN=...
```

### 12.3 Deployment Checklist

- [ ] Database migration completed
- [ ] Environment variables configured
- [ ] SSL certificate installed
- [ ] CDN configured
- [ ] Monitoring setup
- [ ] Error tracking setup
- [ ] Backup strategy implemented
- [ ] Load testing completed
- [ ] Security audit completed
- [ ] User training completed
- [ ] Documentation published
- [ ] Rollback plan documented
- [ ] Support team briefed

---

## 13. Conclusion

Rewrite aplikasi Petshop Management System dari Electron desktop ke Next.js web application akan memberikan banyak keuntungan dalam hal aksesibilitas, scalability, dan maintenance. Dengan mengikuti PRD ini, development team dapat membangun aplikasi web yang robust, secure, dan user-friendly yang memenuhi semua kebutuhan bisnis.

**Next Steps**:
1. Review dan approval PRD
2. Setup development environment
3. Create detailed technical design document
4. Start Phase 1 development
5. Regular progress reviews

---

**Document Version**: 1.0  
**Last Updated**: 1 Maret 2026  
**Author**: Development Team  
**Status**: Draft - Awaiting Approval
