# Audit Kode: Petshop Management System

## 1. Ringkasan Kondisi Project

### Stack Teknologi
- **Frontend**: React 19 + TypeScript + MUI + React Router + React Hook Form
- **Backend**: Electron (Node.js) dengan IPC handlers
- **Database Lokal**: sql.js (SQLite in-memory dengan persisted file)
- **Database Cloud**: PostgreSQL via Drizzle ORM + node-postgres
- **Arsitektur**: Controller-Service-Repository pattern dengan IPC bridge

### Struktur Yang Baik ✓
- Pemisahan yang jelas antara `main/`, `preload/`, dan `renderer/`
- Service layer yang terpisah dari controller
- Penggunaan TypeScript dengan type definitions
- Soft delete pattern untuk data integrity
- Role-based access control (RBAC) di frontend

### Kondisi Umum
Project ini **belum siap production** dan memerlukan perbaikan signifikan terutama di area **security** dan **error handling**. Dengan perbaikan yang tepat, arsitektur dasarnya cukup solid untuk dikembangkan.

---

## 2. Daftar Temuan (Prioritized)

### ❗ CRITICAL - Harus Diperbaiki Segera

#### 2.1 Password Storage dalam Plain Text

**File**: `src/main/services/auth.service.ts:18-21`, `src/main/services/user.service.ts:80-83`, `src/main/seed.ts:150-152`

```typescript
// auth.service.ts - Login dengan plain text password comparison
const stmt = this.db.prepare(
  'SELECT * FROM user WHERE (email = ? OR name = ?) AND password = ? AND deleted_at IS NULL'
)
stmt.bind([identifier, identifier, password])
```

```typescript
// seed.ts - Admin password hardcoded dalam plain text
db.run(
  'INSERT OR IGNORE INTO user (id, name, email, password, ...) VALUES (...)',
  [adminUserId, 'Admin', 'admin@example.com', 'admin123', ...]
)
```

**Dampak**: 
- Jika database bocor, semua password user terekspos
- Tidak ada protection terhadap credential stuffing
- Melanggar standar keamanan (OWASP)

**Perbaikan**:
```typescript
import { createHash, randomBytes, timingSafeEqual } from 'crypto'

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  salt = salt || randomBytes(16).toString('hex')
  const hash = createHash('sha256').update(password + salt).digest('hex')
  return { hash, salt }
}

function verifyPassword(password: string, storedHash: string, storedSalt: string): boolean {
  const { hash } = hashPassword(password, storedSalt)
  return timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash))
}
```

---

#### 2.2 PIN Storage dalam Plain Text

**File**: `src/main/services/auth.service.ts:91-108`, `src/main/services/shift.service.ts:306-319`

```typescript
// PIN verification tanpa hashing
async verifyPin(userId: string, pin: string): Promise<boolean> {
  // ...
  return userPin === pin  // Plain text comparison!
}
```

**Dampak**: PIN untuk operasi sensitif (kasir shift takeover) terekspos.

**Perbaikan**: Gunakan hashing yang sama seperti password.

---

#### 2.3 Tidak Ada Session Management / Token Expiry

**File**: `src/main/services/auth.service.ts:80-88`, `src/renderer/src/lib/authStorage.ts`

```typescript
// Token adalah user ID tanpa expiry
return {
  token: userId,  // User ID sebagai token!
  userName,
  // ...
}
```

```typescript
// Token disimpan di localStorage tanpa expiry
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}
```

**Dampak**:
- Token tidak pernah expire
- Session hijacking sangat mudah
- Tidak ada cara untuk invalidate session

**Perbaikan**:
```typescript
import { randomUUID } from 'crypto'

interface Session {
  sessionId: string
  userId: string
  createdAt: number
  expiresAt: number
}

async login(identifier: string, password: string): Promise<AuthResult> {
  // ... verify credentials ...
  
  const sessionId = randomUUID()
  const expiresAt = Date.now() + (8 * 60 * 60 * 1000) // 8 hours
  
  this.db.run(
    'INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
    [sessionId, userId, Date.now(), expiresAt]
  )
  
  return { token: sessionId, expiresAt, ... }
}

async validateSession(sessionId: string): Promise<Session | null> {
  const stmt = this.db.prepare(
    'SELECT * FROM sessions WHERE id = ? AND expires_at > ? AND revoked_at IS NULL'
  )
  stmt.bind([sessionId, Date.now()])
  // ...
}
```

---

#### 2.4 User-Controllable Permissions di Frontend

**File**: `src/renderer/src/lib/authStorage.ts`, `src/renderer/src/contexts/AuthContext.tsx`

```typescript
// Permissions disimpan di localStorage - user bisa modify!
export function setPermissions(permissions: string[]): void {
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions))
}
```

**Dampak**: User bisa membuka DevTools dan menambahkan permission apapun:
```javascript
localStorage.setItem('auth_permissions', '["master.user.manage","settings.access-control.manage"]')
```

**Perbaikan**: 
1. Backend harus SELALU memverifikasi permissions sebelum operasi sensitif
2. Permissions di frontend hanya untuk UI hiding, bukan security

```typescript
// Di setiap controller yang sensitif, tambahkan permission check
private async getAll(_event: IpcMainInvokeEvent, userId: string): Promise<ApiResponse> {
  try {
    // Verify permission di backend
    const hasPermission = await this.authService.checkPermission(userId, 'master.user.manage')
    if (!hasPermission) {
      return { success: false, error: 'Unauthorized' }
    }
    // ... proceed ...
  }
}
```

---

#### 2.5 Preload Sandbox Disabled

**File**: `src/main/index.ts:22`

```typescript
webPreferences: {
  preload: join(__dirname, '../preload/index.js'),
  sandbox: false  // Security risk!
}
```

**Dampak**: Jika ada XSS vulnerability di renderer, attacker bisa mengakses Node.js APIs.

**Perbaikan**: Enable sandbox dan use context isolation properly:
```typescript
webPreferences: {
  preload: join(__dirname, '../preload/index.js'),
  sandbox: true,
  contextIsolation: true,
  nodeIntegration: false
}
```

---

### ⚠️ MEDIUM - Perlu Diperbaiki Sebelum Production

#### 2.6 Tidak Ada Input Validation di Backend

**File**: Semua controller files

```typescript
// transaction.controller.ts - Data langsung dikirim ke service tanpa validasi
ipcMain.handle('db:transactions:create', async (_, data) => {
  try {
    const transaction = await this.transactionService.create(data)  // No validation!
    return { success: true, data: transaction }
  }
})
```

**Dampak**: 
- Malformed data bisa corrupt database
- Negative quantities, invalid prices bisa masuk
- Potential for business logic bypass

**Perbaikan**: Gunakan Zod untuk validasi di backend juga:
```typescript
import { z } from 'zod'

const createTransactionSchema = z.object({
  code: z.string().min(1),
  storeId: z.string().uuid(),
  subtotal: z.string().regex(/^\d+(\.\d{1,2})?$/),
  total: z.string().regex(/^\d+(\.\d{1,2})?$/),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().positive().int(),
    price: z.string().regex(/^\d+(\.\d{1,2})?$/)
  })).min(1)
})

ipcMain.handle('db:transactions:create', async (_, data) => {
  const parseResult = createTransactionSchema.safeParse(data)
  if (!parseResult.success) {
    return { success: false, error: 'Invalid input', details: parseResult.error }
  }
  // ...
})
```

---

#### 2.7 Race Condition pada Inventory Deduction

**File**: `src/main/services/transaction.service.ts:254-280`

```typescript
for (const item of data.items) {
  // ...
  // INV-001: Record stock transaction and deduct inventory
  if (this.stockTransactionService && this.productLocationService) {
    await this.stockTransactionService.create({ ... })
    await this.productLocationService.adjustQuantity(
      item.productId,
      data.storeId,
      -item.quantity
    )
  }
}
```

**Dampak**: 
- Dua transaksi bersamaan bisa menyebabkan overselling
- Stock bisa menjadi negatif
- Tidak ada check ketersediaan stock sebelum deduct

**Perbaikan**:
```typescript
async create(data: CreateTransactionDto): Promise<Transaction> {
  // Check stock availability first
  for (const item of data.items) {
    const available = await this.productLocationService.getAvailableQuantity(
      item.productId, 
      data.storeId
    )
    if (available < item.quantity) {
      throw new Error(`Insufficient stock for product ${item.productId}`)
    }
  }
  
  // Use BEGIN TRANSACTION for atomicity in sql.js
  this.db.run('BEGIN TRANSACTION')
  try {
    // ... create transaction and deduct stock ...
    this.db.run('COMMIT')
  } catch (e) {
    this.db.run('ROLLBACK')
    throw e
  }
}
```

---

#### 2.8 Transaction Code Tidak Unique-Safe

**File**: `src/renderer/src/pages/sales/index.tsx:265`

```typescript
const code = `TRX-${Date.now()}`  // Collision possible!
```

**Dampak**: Jika dua transaksi dibuat dalam millisecond yang sama, code-nya bentrok.

**Perbaikan**:
```typescript
const code = `TRX-${Date.now()}-${randomUUID().slice(0, 8)}`
// Atau gunakan sequence di database
```

---

#### 2.9 SQL Query Building dengan String Interpolation

**File**: `src/main/services/shift.service.ts:149-178`

```typescript
let query = `
  SELECT cs.*, u.name as user_name
  FROM cashier_shift cs
  LEFT JOIN user u ON cs.user_id = u.id
  WHERE cs.deleted_at IS NULL
`
// Dynamic query building - tidak ada injection karena parameterized, tapi fragile
if (filters?.userId) {
  query += ' AND cs.user_id = ?'
  params.push(filters.userId)
}
```

**Note**: Ini sebenarnya aman karena menggunakan parameterized queries, tapi pattern-nya mudah salah. Disarankan gunakan query builder.

---

#### 2.10 Tidak Ada Pagination untuk Large Datasets

**File**: Hampir semua `findAll()` methods

```typescript
// transaction.service.ts
async findAll(): Promise<Transaction[]> {
  const stmt = this.db.prepare(
    'SELECT * FROM transactions WHERE deleted_at IS NULL ORDER BY created_at DESC'
  )
  // Returns ALL transactions - memory explosion waiting to happen
}
```

**Dampak**: Dengan 100K+ transaksi, ini akan OOM atau freeze UI.

**Perbaikan**:
```typescript
async findAll(options?: { limit?: number; offset?: number }): Promise<{ 
  data: Transaction[]; 
  total: number; 
  hasMore: boolean 
}> {
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0
  
  const countStmt = this.db.prepare('SELECT COUNT(*) as total FROM transactions WHERE deleted_at IS NULL')
  const total = countStmt.step() ? countStmt.getAsObject().total as number : 0
  countStmt.free()
  
  const stmt = this.db.prepare(`
    SELECT * FROM transactions 
    WHERE deleted_at IS NULL 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `)
  stmt.bind([limit, offset])
  // ...
}
```

---

#### 2.11 Excessive Disk I/O - saveDb() After Every Operation

**File**: Semua service files memanggil `saveDb()` setelah setiap operasi

```typescript
// user.service.ts
async create(data: CreateUserDto): Promise<User> {
  // ...
  this.db.run('INSERT INTO user ...')
  saveDb(this.db)  // Full database write!
  return {...}
}
```

**Dampak**: Performance bottleneck, terutama saat high-frequency operations.

**Perbaikan**:
```typescript
// Batch saves dengan debounce
let saveTimer: NodeJS.Timeout | null = null
let pendingChanges = 0

function scheduleDbSave() {
  pendingChanges++
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    if (pendingChanges > 0) {
      saveDb(db)
      pendingChanges = 0
    }
  }, 1000) // Save at most once per second
}

// Untuk operasi kritis, tetap force save
function forceSaveDb() {
  if (saveTimer) clearTimeout(saveTimer)
  saveDb(db)
  pendingChanges = 0
}
```

---

#### 2.12 Decimal Handling dengan String - Precision Issues

**File**: Pricing, transactions, shifts - semua menggunakan string untuk money

```typescript
// Multiple places
const expectedCash = parseFloat(shift.initialCash) + netSales - totalExpenses
return expectedCash.toString()
```

**Dampak**: `parseFloat` bisa kehilangan precision untuk angka besar atau operasi kompleks.

**Perbaikan**: Gunakan library untuk monetary calculations:
```typescript
import Decimal from 'decimal.js'

const initialCash = new Decimal(shift.initialCash)
const expected = initialCash.plus(netSales).minus(totalExpenses)
return expected.toFixed(2)
```

---

### 💡 IMPROVEMENT - Nice to Have

#### 2.13 Missing Database Indexes

**File**: `src/main/localDb.ts`

Tidak ada CREATE INDEX statements. Queries pada:
- `transactions.created_at` (untuk filtering by date range)
- `transactions.store_id` 
- `product_location.product_id + store_id`
- `user.email`

**Perbaikan**:
```sql
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_store_id ON transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_product_location_product_store ON product_location(product_id, store_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email ON user(email) WHERE deleted_at IS NULL;
```

---

#### 2.14 Dead/Unused Code

**File**: `src/renderer/src/pages/Pets.tsx`
```typescript
export default function Pets(): React.JSX.Element {
  return <div>Pets</div>
}
```
File placeholder yang tidak digunakan.

**File**: `package.json`
```json
"silly": "^0.2.0"  // Tidak terpakai di codebase
```

---

#### 2.15 Inconsistent Error Messages

Beberapa error messages in English, beberapa in Indonesian:
```typescript
throw new Error('Invalid email or password')  // English
setSnackbar({ message: 'Gagal memuat data', ... })  // Indonesian
```

**Perbaikan**: Gunakan i18n library seperti `react-i18next`.

---

#### 2.16 Missing TypeScript Strict Checks

**File**: `tsconfig*.json`

```json
// Tidak ada strict: true di beberapa configs
```

Dan banyak `any` usage:
```typescript
private mapRowToUser(row: any): User  // Unsafe
```

---

#### 2.17 Console.log di Production Code

```typescript
console.log('✓ Local database loaded:', dbPath)
console.log(`✓ ${entity}: ${count} pulled, ${conflicts} conflicts`)
```

**Perbaikan**: Gunakan proper logging library dengan levels:
```typescript
import log from 'electron-log'
log.info('Database loaded:', dbPath)
```

---

## 3. Saran Refactor Bertahap

### Phase 1: Security Fixes (1-2 minggu)
1. ✅ Implement password hashing dengan bcrypt/argon2
2. ✅ Implement proper session management dengan expiry
3. ✅ Add backend permission verification
4. ✅ Enable Electron sandbox

### Phase 2: Data Integrity (1 minggu)
1. ✅ Add input validation dengan Zod di backend
2. ✅ Fix race conditions dengan transactions
3. ✅ Add stock availability checks
4. ✅ Generate unique transaction codes

### Phase 3: Performance (1 minggu)
1. ✅ Implement pagination
2. ✅ Add database indexes
3. ✅ Batch database saves
4. ✅ Use Decimal.js untuk monetary calculations

### Phase 4: Code Quality (ongoing)
1. Enable TypeScript strict mode
2. Remove dead code
3. Add comprehensive logging
4. Implement i18n
5. Add unit tests

---

## 4. Checklist Sebelum Production

### Security
- [ ] Semua password di-hash dengan bcrypt/argon2
- [ ] Session tokens dengan expiry
- [ ] Backend permission verification di semua endpoints sensitif
- [ ] Electron sandbox enabled
- [ ] Input validation di backend
- [ ] Rate limiting untuk login attempts
- [ ] HTTPS untuk cloud sync

### Data Integrity
- [ ] Stock availability check sebelum sale
- [ ] Transaction atomicity dengan BEGIN/COMMIT/ROLLBACK
- [ ] Unique constraints di database
- [ ] Foreign key integrity (jika supported)

### Performance
- [ ] Pagination untuk semua list endpoints
- [ ] Database indexes pada frequently queried columns
- [ ] Lazy loading untuk large datasets
- [ ] Connection pooling untuk PostgreSQL

### Operations
- [ ] Proper logging (bukan console.log)
- [ ] Error tracking (Sentry atau sejenisnya)
- [ ] Database backup strategy
- [ ] Application update mechanism testing
- [ ] Load testing dengan realistic data volume

### Code Quality
- [ ] TypeScript strict mode
- [ ] No `any` types
- [ ] Unit tests untuk business logic
- [ ] Integration tests untuk critical flows
- [ ] Code review by second engineer

---

## Asumsi yang Dibuat

1. **Ini adalah aplikasi desktop Electron**, bukan web app yang accessible dari internet. Beberapa vulnerability (XSS, CSRF) less critical dalam konteks ini, tapi tetap harus di-address.

2. **Database lokal sql.js** adalah primary storage, dengan PostgreSQL sebagai cloud sync optional. Ini berarti security utama bergantung pada keamanan device.

3. **User base target** adalah small-to-medium businesses dengan volume transaksi ratusan per hari, bukan thousands per second.

4. **Tidak ada sensitive data PII** selain nama dan email customer.

---

## Severity Summary

| Severity | Count | Examples |
|----------|-------|----------|
| ❗ Critical | 5 | Plain text passwords, no session expiry, frontend permission bypass |
| ⚠️ Medium | 7 | No input validation, race conditions, no pagination |
| 💡 Improvement | 5 | Missing indexes, dead code, inconsistent i18n |

**Rekomendasi**: Jangan deploy ke production sebelum semua Critical issues di-fix. Medium issues bisa ditolerir untuk beta/pilot testing dengan user terbatas.
