import { Database } from 'sql.js'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'
import { ExpenseCloudService, Expense } from './expense-cloud.service'
import { AuditLogService } from './audit-log.service'
import { QueueService } from './queue.service'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'

export interface CashierShift {
  id: string
  userId: string
  storeId: string
  status: 'OPEN' | 'CLOSED'
  initialCash: string
  closingCash: string | null
  expectedCash: string | null
  difference: string | null
  notes: string | null
  openedAt: Date
  closedAt: Date | null
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
  deviceId: string | null
  // Joined fields
  userName?: string
}

export interface ShiftHistory {
  id: string
  shiftId: string
  userId: string
  action: 'OPEN' | 'CLOSE' | 'TAKEOVER' | 'BREAK'
  notes: string | null
  createdAt: Date
  deviceId: string | null
  // Joined fields
  userName?: string
}

export interface OpenShiftDto {
  userId: string
  storeId: string
  initialCash: string
}

export interface CloseShiftDto {
  closingCash: string
  notes?: string
}

export interface ShiftSummary {
  shift: CashierShift
  transactionCount: number
  totalSales: string
  totalDiscount: string
  totalTax: string
  netSales: string
  expectedCash: string
  totalExpenses: string
  expenseCount: number
  transactions: {
    id: string
    code: string
    total: string
    discount: string
    paymentMethod: string
    createdAt: Date
    customerName?: string
  }[]
  paymentMethodStats: Record<string, string>
  expenses: Expense[]
}

export class ShiftService {
  constructor(
    private db: Database,
    private expenseService: ExpenseCloudService,
    private queueService: QueueService, // Make it required for new architecture
    private auditLogService?: AuditLogService
  ) {}
  
  private isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  /**
   * Get current open shift for a user
   */
  async getCurrentShift(userId: string): Promise<CashierShift | null> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(`
          SELECT cs.*, u.name as user_name
          FROM cashier_shift cs
          LEFT JOIN "user" u ON cs.user_id = u.id
          WHERE cs.user_id = $1 AND cs.status = 'OPEN' AND cs.deleted_at IS NULL
          ORDER BY cs.opened_at DESC LIMIT 1
        `, [userId])
        
        if (result.rows.length > 0) {
          return this.mapRowToShift(result.rows[0])
        }
        return null
      } catch (error) {
        console.error('[ShiftService] getCurrentShift cloud error, falling back to local:', error)
      }
    }
  
    const stmt = this.db.prepare(
      `SELECT cs.*, u.name as user_name
       FROM cashier_shift cs
       LEFT JOIN user u ON cs.user_id = u.id
       WHERE cs.user_id = ? AND cs.status = 'OPEN' AND cs.deleted_at IS NULL
       ORDER BY cs.opened_at DESC LIMIT 1`
    )
    stmt.bind([userId])
    if (stmt.step()) {
      const result = this.mapRowToShift(stmt.getAsObject())
      stmt.free()
      return result
    }
    stmt.free()
    return null
  }

  /**
   * Check if there's ANY open shift across all users
   * Used for app close guard
   */
  async hasAnyOpenShift(): Promise<{ hasOpen: boolean; shift: CashierShift | null }> {
    const stmt = this.db.prepare(
      `SELECT cs.*, u.name as user_name
       FROM cashier_shift cs
       LEFT JOIN user u ON cs.user_id = u.id
       WHERE cs.status = 'OPEN' AND cs.deleted_at IS NULL
       ORDER BY cs.opened_at DESC LIMIT 1`
    )
    if (stmt.step()) {
      const result = this.mapRowToShift(stmt.getAsObject())
      stmt.free()
      return { hasOpen: true, shift: result }
    }
    stmt.free()
    return { hasOpen: false, shift: null }
  }

  /**
   * Get current open shift for a store (any user)
   */
  async getCurrentStoreShift(storeId: string): Promise<CashierShift | null> {
    const stmt = this.db.prepare(
      `SELECT cs.*, u.name as user_name
       FROM cashier_shift cs
       LEFT JOIN user u ON cs.user_id = u.id
       WHERE cs.store_id = ? AND cs.status = 'OPEN' AND cs.deleted_at IS NULL
       ORDER BY cs.opened_at DESC LIMIT 1`
    )
    stmt.bind([storeId])
    if (stmt.step()) {
      const result = this.mapRowToShift(stmt.getAsObject())
      stmt.free()
      return result
    }
    stmt.free()
    return null
  }

  /**
   * Get shift by ID
   */
  async findById(id: string): Promise<CashierShift | null> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(`
          SELECT cs.*, u.name as user_name
          FROM cashier_shift cs
          LEFT JOIN "user" u ON cs.user_id = u.id
          WHERE cs.id = $1 AND cs.deleted_at IS NULL
        `, [id])
        
        if (result.rows.length > 0) {
          return this.mapRowToShift(result.rows[0])
        }
        return null
      } catch (error) {
        console.error('[ShiftService] findById cloud error, falling back to local:', error)
      }
    }

    const stmt = this.db.prepare(
      `SELECT cs.*, u.name as user_name
       FROM cashier_shift cs
       LEFT JOIN user u ON cs.user_id = u.id
       WHERE cs.id = ? AND cs.deleted_at IS NULL`
    )
    stmt.bind([id])
    if (stmt.step()) {
      const result = this.mapRowToShift(stmt.getAsObject())
      stmt.free()
      return result
    }
    stmt.free()
    return null
  }

  /**
   * Get all shifts (with optional filters)
   */
  async getAll(filters?: {
    userId?: string
    storeId?: string
    status?: 'OPEN' | 'CLOSED'
    fromDate?: number
    toDate?: number
  }): Promise<CashierShift[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        let query = `
          SELECT cs.*, u.name as user_name
          FROM cashier_shift cs
          LEFT JOIN "user" u ON cs.user_id = u.id
          WHERE cs.deleted_at IS NULL
        `
        const params: any[] = []

        if (filters?.userId) {
          query += ` AND cs.user_id = $${params.length + 1}`
          params.push(filters.userId)
        }
        if (filters?.storeId) {
          query += ` AND cs.store_id = $${params.length + 1}`
          params.push(filters.storeId)
        }
        if (filters?.status) {
          query += ` AND cs.status = $${params.length + 1}`
          params.push(filters.status)
        }
        if (filters?.fromDate) {
          query += ` AND cs.opened_at >= $${params.length + 1}`
          params.push(new Date(filters.fromDate))
        }
        if (filters?.toDate) {
          query += ` AND cs.opened_at <= $${params.length + 1}`
          params.push(new Date(filters.toDate))
        }

        query += ' ORDER BY cs.opened_at DESC'

        const result = await pool.query(query, params)
        return result.rows.map(row => this.mapRowToShift(row))
      } catch (error) {
        console.error('[ShiftService] getAll cloud error, falling back to local:', error)
      }
    }

    let query = `
      SELECT cs.*, u.name as user_name
      FROM cashier_shift cs
      LEFT JOIN user u ON cs.user_id = u.id
      WHERE cs.deleted_at IS NULL
    `
    const params: (string | number)[] = []

    if (filters?.userId) {
      query += ' AND cs.user_id = ?'
      params.push(filters.userId)
    }
    if (filters?.storeId) {
      query += ' AND cs.store_id = ?'
      params.push(filters.storeId)
    }
    if (filters?.status) {
      query += ' AND cs.status = ?'
      params.push(filters.status)
    }
    if (filters?.fromDate) {
      query += ' AND cs.opened_at >= ?'
      params.push(filters.fromDate)
    }
    if (filters?.toDate) {
      query += ' AND cs.opened_at <= ?'
      params.push(filters.toDate)
    }

    query += ' ORDER BY cs.opened_at DESC'

    const stmt = this.db.prepare(query)
    if (params.length > 0) {
      stmt.bind(params)
    }

    const results: CashierShift[] = []
    while (stmt.step()) {
      results.push(this.mapRowToShift(stmt.getAsObject()))
    }
    stmt.free()
    return results
  }

  /**
   * Open a new shift
   */
  async openShift(data: OpenShiftDto): Promise<CashierShift> {
    // Check if user already has an open shift
    const existingShift = await this.getCurrentShift(data.userId)
    if (existingShift) {
      throw new Error('User already has an open shift')
    }

    const id = randomUUID()
    const now = Date.now()

    this.db.run(
      `INSERT INTO cashier_shift
       (id, user_id, store_id, status, initial_cash, opened_at, created_at, updated_at)
       VALUES (?, ?, ?, 'OPEN', ?, ?, ?, ?)`,
      [id, data.userId, data.storeId, data.initialCash, now, now, now]
    )
    
    // Queue for sync
    await this.queueService.add('INSERT', 'cashier_shift', {
        id,
        user_id: data.userId,
        store_id: data.storeId,
        status: 'OPEN',
        initial_cash: data.initialCash,
        opened_at: new Date(now).toISOString(),
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString()
    })

    // Add to shift history
    this.addShiftHistory(id, data.userId, 'OPEN', 'Shift opened')

    saveDb(this.db)

    const shift = await this.findById(id)
    if (!shift) {
      throw new Error('Failed to create shift')
    }
    if (this.auditLogService) {
      void this.auditLogService.log({
        action: 'SHIFT_OPEN',
        entityType: 'shift',
        entityId: id,
        userId: data.userId,
        storeId: data.storeId,
        newValues: { initialCash: data.initialCash },
        metadata: { status: 'OPEN' }
      })
    }
    return shift
  }

  /**
   * Close a shift
   */
  async closeShift(shiftId: string, userId: string, data: CloseShiftDto): Promise<CashierShift> {
    // Get shift from local DB first to ensure consistency with what we are closing
    // We already moved findById to cloud-first, but here we might need local record to update logic.
    // However, findById will fallback to local, so safe.
    const shift = await this.findById(shiftId)
    if (!shift) {
      throw new Error('Shift not found')
    }
    if (shift.status === 'CLOSED') {
      throw new Error('Shift is already closed')
    }

    // Calculate expected cash (initial + sales total)
    const expectedCash = await this.calculateExpectedCash(shiftId, shift.initialCash)
    const closingCash = parseFloat(data.closingCash) || 0
    const difference = closingCash - parseFloat(expectedCash)

    const now = Date.now()

    this.db.run(
      `UPDATE cashier_shift SET
       status = 'CLOSED',
       closing_cash = ?,
       expected_cash = ?,
       difference = ?,
       notes = ?,
       closed_at = ?,
       updated_at = ?
       WHERE id = ?`,
      [data.closingCash, expectedCash, difference.toString(), data.notes ?? null, now, now, shiftId]
    )
    
    // Queue for sync
    await this.queueService.add('UPDATE', 'cashier_shift', {
        id: shiftId,
        status: 'CLOSED',
        closing_cash: data.closingCash,
        expected_cash: expectedCash,
        difference: difference.toString(),
        notes: data.notes ?? null,
        closed_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString()
    })

    // Add to shift history
    this.addShiftHistory(shiftId, userId, 'CLOSE', data.notes ?? 'Shift closed')

    saveDb(this.db)

    const updatedShift = await this.findById(shiftId)
    if (!updatedShift) {
      throw new Error('Failed to update shift')
    }

    if (this.auditLogService) {
      void this.auditLogService.log({
        action: 'SHIFT_CLOSE',
        entityType: 'shift',
        entityId: shiftId,
        userId: userId,
        storeId: shift.storeId,
        newValues: { closingCash: data.closingCash, expectedCash, difference: difference.toString() },
        oldValues: { initialCash: shift.initialCash },
        metadata: { status: 'CLOSED', notes: data.notes }
      })
    }
    return updatedShift
  }

  /**
   * Calculate expected cash based on initial cash + sales during shift
   */
  private async calculateExpectedCash(shiftId: string, initialCash: string): Promise<string> {
    const shift = await this.findById(shiftId)
    if (!shift) return initialCash

    // Get total CASH sales during this shift
    const stmt = this.db.prepare(
      `SELECT COALESCE(SUM(CAST(total AS REAL)), 0) as total_sales
       FROM transactions
       WHERE user_id = ?
       AND store_id = ?
       AND payment_method = 'cash'
       AND created_at >= ?
       AND (? IS NULL OR created_at <= ?)
       AND deleted_at IS NULL`
    )
    stmt.bind([
      shift.userId,
      shift.storeId,
      shift.openedAt.getTime(),
      shift.closedAt?.getTime() ?? null,
      shift.closedAt?.getTime() ?? null
    ])

    let totalCashSales = 0
    if (stmt.step()) {
      const row = stmt.getAsObject()
      totalCashSales = (row.total_sales as number) || 0
    }
    stmt.free()
    
    // Expenses are assumed to be cash taken from drawer
    // We should ideally filter expenses by payment method too if expenses can be non-cash,
    // but usually 'Expense' in this context is Petty Cash.
    // However, let's verify if we need to subtract expenses here.
    // The previous implementation didn't subtract expenses in calculateExpectedCash, 
    // but getShiftSummary DID.
    // Consistency check: The simple calculateExpectedCash checks "Initial + Sales".
    // If expenses are paid from drawer, they MUST be subtracted.
    
    // Fetch expenses for this shift to subtract
    const expenses = await this.expenseService.findByShiftId(shiftId)
    const totalCashExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.total) || 0), 0)

    const expected = parseFloat(initialCash) + totalCashSales - totalCashExpenses
    return expected.toString()
  }

  /**
   * Takeover shift (backup cashier)
   */
  async takeoverShift(shiftId: string, newUserId: string, pin: string): Promise<CashierShift> {
    // Verify PIN
    const userStmt = this.db.prepare('SELECT id, pin FROM user WHERE id = ? AND deleted_at IS NULL')
    userStmt.bind([newUserId])
    if (!userStmt.step()) {
      userStmt.free()
      throw new Error('User not found')
    }
    const user = userStmt.getAsObject()
    userStmt.free()

    if (!user.pin || user.pin !== pin) {
      throw new Error('Invalid PIN')
    }

    const shift = await this.findById(shiftId)
    if (!shift) {
      throw new Error('Shift not found')
    }
    if (shift.status === 'CLOSED') {
      throw new Error('Shift is already closed')
    }

    const now = Date.now()

    // Update shift with new user
    this.db.run('UPDATE cashier_shift SET user_id = ?, updated_at = ? WHERE id = ?', [
      newUserId,
      now,
      shiftId
    ])
    
    // Queue for sync
    await this.queueService.add('UPDATE', 'cashier_shift', {
      id: shiftId,
      user_id: newUserId,
      updated_at: new Date(now).toISOString()
    })

    // Add to shift history
    this.addShiftHistory(shiftId, newUserId, 'TAKEOVER', 'Shift taken over')

    saveDb(this.db)

    const updatedShift = await this.findById(shiftId)
    if (!updatedShift) {
      throw new Error('Failed to update shift')
    }
    return updatedShift
  }

  /**
   * Get shift history
   */
  async getShiftHistory(shiftId: string): Promise<ShiftHistory[]> {
    const stmt = this.db.prepare(
      `SELECT sh.*, u.name as user_name
       FROM shift_history sh
       LEFT JOIN user u ON sh.user_id = u.id
       WHERE sh.shift_id = ?
       ORDER BY sh.created_at ASC`
    )
    stmt.bind([shiftId])

    const results: ShiftHistory[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push({
        id: row.id as string,
        shiftId: row.shift_id as string,
        userId: row.user_id as string,
        action: row.action as ShiftHistory['action'],
        notes: row.notes as string | null,
        createdAt: new Date(row.created_at as number),
        deviceId: row.device_id as string | null,
        userName: row.user_name as string | undefined
      })
    }
    stmt.free()
    return results
  }

  /**
   * Get shift summary for settlement
   */
  async getShiftSummary(shiftId: string): Promise<ShiftSummary | null> {
    const shift = await this.findById(shiftId)
    if (!shift) return null

    // Cloud-First: Try to get transactions from Cloud
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const txResult = await pool.query(`
          SELECT t.id, t.code, t.subtotal, t.discount, t.tax, t.total, t.created_at, t.payment_method,
                 c.name as customer_name
          FROM transactions t
          LEFT JOIN customer c ON t.customer_id = c.id
          WHERE t.store_id = $1
            AND t.user_id = $2
            AND t.created_at >= $3
            AND ($4::bigint IS NULL OR t.created_at <= $5)
            AND t.deleted_at IS NULL
          ORDER BY t.created_at ASC
        `, [
          shift.storeId,
          shift.userId,
          shift.openedAt,
          shift.closedAt ? shift.closedAt.getTime() : null, // Pass as bigint/number or date? Postgres driver handles Date
          shift.closedAt
        ])

        const transactions: ShiftSummary['transactions'] = []
        const paymentMethodStats: Record<string, number> = {}
        let totalSales = 0
        let totalDiscount = 0
        let totalTax = 0
        let totalCashSales = 0

        for (const row of txResult.rows) {
             transactions.push({
                id: row.id,
                code: row.code,
                total: row.total,
                discount: row.discount || '0',
                paymentMethod: row.payment_method || 'cash',
                createdAt: new Date(row.created_at),
                customerName: row.customer_name
              })

              totalSales += parseFloat(row.subtotal) || 0
              totalDiscount += parseFloat(row.discount) || 0
              totalTax += parseFloat(row.tax) || 0

              const method = (row.payment_method) || 'cash'
              const totalVal = parseFloat(row.total) || 0
              paymentMethodStats[method] = (paymentMethodStats[method] || 0) + totalVal
              
              if (method === 'cash') {
                totalCashSales += totalVal
              }
        }

        const netSales = transactions.reduce((sum, t) => sum + parseFloat(t.total), 0)

        // Expenses (already cloud-first service)
        const expenses = await this.expenseService.findByShiftId(shiftId)
        const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.total) || 0), 0)
        const expenseCount = expenses.length

        const expectedCash = parseFloat(shift.initialCash) + totalCashSales - totalExpenses

        const paymentMethodStatsStr: Record<string, string> = {}
        for (const [method, amount] of Object.entries(paymentMethodStats)) {
          paymentMethodStatsStr[method] = amount.toString()
        }

        return {
          shift,
          transactionCount: transactions.length,
          totalSales: netSales.toString(),
          totalDiscount: totalDiscount.toString(),
          totalTax: totalTax.toString(),
          netSales: netSales.toString(),
          expectedCash: expectedCash.toString(),
          totalExpenses: totalExpenses.toString(),
          expenseCount,
          transactions,
          paymentMethodStats: paymentMethodStatsStr,
          expenses
        }

      } catch (error) {
        console.error('[ShiftService] getShiftSummary cloud error, falling back to local:', error)
      }
    }

    // Get transactions during this shift (Filtered by USER and STORE)
    const txStmt = this.db.prepare(
      `SELECT t.id, t.code, t.subtotal, t.discount, t.tax, t.total, t.created_at, t.payment_method,
              c.name as customer_name
       FROM transactions t
       LEFT JOIN customer c ON t.customer_id = c.id
       WHERE t.store_id = ?
         AND t.user_id = ?
         AND t.created_at >= ?
         AND (? IS NULL OR t.created_at <= ?)
         AND t.deleted_at IS NULL
       ORDER BY t.created_at ASC`
    )
    txStmt.bind([
      shift.storeId,
      shift.userId,
      shift.openedAt.getTime(),
      shift.closedAt?.getTime() ?? null,
      shift.closedAt?.getTime() ?? null
    ])

    const transactions: ShiftSummary['transactions'] = []
    const paymentMethodStats: Record<string, number> = {}
    let totalSales = 0
    let totalDiscount = 0
    let totalTax = 0
    let totalCashSales = 0

    while (txStmt.step()) {
      const row = txStmt.getAsObject()
      transactions.push({
        id: row.id as string,
        code: row.code as string,
        total: row.total as string,
        discount: (row.discount as string) || '0',
        paymentMethod: (row.payment_method as string) || 'cash',
        createdAt: new Date(row.created_at as number),
        customerName: row.customer_name as string | undefined
      })
      
      
      // Actually row.total is what we care about for cash flow.
      
      totalSales += parseFloat(row.subtotal as string) || 0 
      
      totalDiscount += parseFloat(row.discount as string) || 0
      totalTax += parseFloat(row.tax as string) || 0

      // Aggregate payment methods
      const method = (row.payment_method as string) || 'cash'
      // Use TOTAL for payment stats
      const totalVal = parseFloat(row.total as string) || 0
      paymentMethodStats[method] = (paymentMethodStats[method] || 0) + totalVal
      
      if (method === 'cash') {
        totalCashSales += totalVal
      }
    }
    txStmt.free()

    const netSales = transactions.reduce((sum, t) => sum + parseFloat(t.total), 0) // Total Revenue (Cash + Non-Cash)

    // Get detailed expenses for this shift
    const expenses = await this.expenseService.findByShiftId(shiftId)
    const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.total) || 0), 0)
    const expenseCount = expenses.length

    // Expected Cash = Initial + Cash Sales Only - Expenses
    const expectedCash = parseFloat(shift.initialCash) + totalCashSales - totalExpenses

    // Convert stats to string
    const paymentMethodStatsStr: Record<string, string> = {}
    for (const [method, amount] of Object.entries(paymentMethodStats)) {
      paymentMethodStatsStr[method] = amount.toString()
    }

    return {
      shift,
      transactionCount: transactions.length,
      totalSales: netSales.toString(), // Use Net Sales (Total paid)
      totalDiscount: totalDiscount.toString(),
      totalTax: totalTax.toString(),
      netSales: netSales.toString(),
      expectedCash: expectedCash.toString(),
      totalExpenses: totalExpenses.toString(),
      expenseCount,
      transactions,
      paymentMethodStats: paymentMethodStatsStr,
      expenses
    }
  }

  /**
   * Add entry to shift history
   */
  private addShiftHistory(
    shiftId: string,
    userId: string,
    action: ShiftHistory['action'],
    notes?: string
  ): void {
    const id = randomUUID()
    const now = Date.now()

    this.db.run(
      `INSERT INTO shift_history (id, shift_id, user_id, action, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, shiftId, userId, action, notes ?? null, now, now]
    )
  }

  /**
   * Map database row to CashierShift object
   */
  private mapRowToShift(row: Record<string, unknown>): CashierShift {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      storeId: row.store_id as string,
      status: row.status as 'OPEN' | 'CLOSED',
      initialCash: row.initial_cash as string,
      closingCash: row.closing_cash as string | null,
      expectedCash: row.expected_cash as string | null,
      difference: row.difference as string | null,
      notes: row.notes as string | null,
      openedAt: new Date(row.opened_at as number),
      closedAt: row.closed_at ? new Date(row.closed_at as number) : null,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null,
      deviceId: row.device_id as string | null,
      userName: row.user_name as string | undefined
    }
  }
}
