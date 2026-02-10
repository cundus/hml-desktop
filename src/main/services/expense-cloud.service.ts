/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from 'crypto'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'

export interface Expense {
  id: string
  shiftId: string | null
  categoryId: string | null
  storeId: string | null
  item: string
  quantity: number
  price: string
  total: string
  description: string | null
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateExpenseDto {
  shiftId?: string
  categoryId?: string
  storeId?: string
  item: string
  quantity?: number
  price: string
  description?: string
  createdBy?: string
}

export interface ExpenseSummary {
  totalExpenses: string
  expenseCount: number
}

export class ExpenseCloudService {
  private isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  async create(data: CreateExpenseDto): Promise<Expense> {
    if (!this.isOnline()) {
      throw new Error('Recording expenses requires internet connection')
    }

    const id = randomUUID()
    const now = new Date()
    const quantity = data.quantity ?? 1
    const total = (parseFloat(data.price) * quantity).toString()

    const expense: Expense = {
      id,
      shiftId: data.shiftId ?? null,
      categoryId: data.categoryId ?? null,
      storeId: data.storeId ?? null,
      item: data.item,
      quantity,
      price: data.price,
      total,
      description: data.description ?? null,
      createdBy: data.createdBy ?? null,
      createdAt: now,
      updatedAt: now
    }

    try {
      const pool = getCloudDb().getPool()
      await pool.query(
        'INSERT INTO expenses (id, shift_id, category_id, store_id, item, quantity, price, total, description, created_by, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
        [
          id,
          data.shiftId ?? null,
          data.categoryId ?? null,
          data.storeId ?? null,
          data.item,
          quantity,
          data.price,
          total,
          data.description ?? null,
          data.createdBy ?? null,
          now,
          now
        ]
      )
      return expense
    } catch (error) {
      console.error('[ExpenseCloud] create error:', error)
      throw error
    }
  }

  async findById(id: string): Promise<Expense | null> {
    if (!this.isOnline()) {
      throw new Error('Offline mode not supported for expenses')
    }

    try {
      const pool = getCloudDb().getPool()
      const result = await pool.query('SELECT * FROM expenses WHERE id = $1', [id])
      if (result.rows.length > 0) return this.mapCloudRow(result.rows[0])
      return null
    } catch (error) {
      console.error('[ExpenseCloud] findById error:', error)
      throw error
    }
  }

  async findAll(): Promise<Expense[]> {
    if (!this.isOnline()) {
      throw new Error('Offline mode not supported for expenses')
    }

    try {
      const pool = getCloudDb().getPool()
      const result = await pool.query('SELECT * FROM expenses ORDER BY created_at DESC')
      return result.rows.map((row) => this.mapCloudRow(row))
    } catch (error) {
      console.error('[ExpenseCloud] findAll error:', error)
      throw error
    }
  }

  async findByShiftId(shiftId: string): Promise<Expense[]> {
    if (!this.isOnline()) {
      throw new Error('Offline mode not supported for expenses')
    }

    try {
      const pool = getCloudDb().getPool()
      const result = await pool.query(
        'SELECT * FROM expenses WHERE shift_id = $1 ORDER BY created_at DESC',
        [shiftId]
      )
      return result.rows.map((row) => this.mapCloudRow(row))
    } catch (error) {
      console.error('[ExpenseCloud] findByShiftId error:', error)
      throw error
    }
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    if (!this.isOnline()) {
      throw new Error('Offline mode not supported for expenses')
    }

    try {
      const pool = getCloudDb().getPool()
      const result = await pool.query(
        'SELECT * FROM expenses WHERE created_at >= $1 AND created_at <= $2 ORDER BY created_at DESC',
        [startDate, endDate]
      )
      return result.rows.map((row) => this.mapCloudRow(row))
    } catch (error) {
      console.error('[ExpenseCloud] findByDateRange error:', error)
      throw error
    }
  }

  async getExpenseSummaryByShift(shiftId: string): Promise<ExpenseSummary> {
    if (!this.isOnline()) {
      throw new Error('Offline mode not supported for expenses')
    }

    try {
      const pool = getCloudDb().getPool()
      const result = await pool.query(
        'SELECT COUNT(*) as count, COALESCE(SUM(CAST(total AS NUMERIC)), 0) as total FROM expenses WHERE shift_id = $1',
        [shiftId]
      )
      if (result.rows.length > 0) {
        return {
          totalExpenses: String(result.rows[0].total || 0),
          expenseCount: parseInt(result.rows[0].count as string) || 0
        }
      }
      return { totalExpenses: '0', expenseCount: 0 }
    } catch (error) {
      console.error('[ExpenseCloud] getExpenseSummaryByShift error:', error)
      throw error
    }
  }

  async getExpenseSummaryByDateRange(startDate: Date, endDate: Date): Promise<ExpenseSummary> {
    if (!this.isOnline()) {
      throw new Error('Offline mode not supported for expenses')
    }

    try {
      const pool = getCloudDb().getPool()
      const result = await pool.query(
        'SELECT COUNT(*) as count, COALESCE(SUM(CAST(total AS NUMERIC)), 0) as total FROM expenses WHERE created_at >= $1 AND created_at <= $2',
        [startDate, endDate]
      )
      if (result.rows.length > 0) {
        return {
          totalExpenses: String(result.rows[0].total || 0),
          expenseCount: parseInt(result.rows[0].count as string) || 0
        }
      }
      return { totalExpenses: '0', expenseCount: 0 }
    } catch (error) {
      console.error('[ExpenseCloud] getExpenseSummaryByDateRange error:', error)
      throw error
    }
  }

  async update(id: string, data: Partial<CreateExpenseDto>): Promise<Expense> {
    if (!this.isOnline()) {
      throw new Error('Offline mode not supported for expenses')
    }

    const existing = await this.findById(id)
    if (!existing) throw new Error('Expense not found')

    const now = new Date()
    const quantity = data.quantity ?? existing.quantity
    const price = data.price ?? existing.price
    const total = (parseFloat(price) * quantity).toString()

    const updated: Expense = {
      ...existing,
      categoryId: data.categoryId ?? existing.categoryId,
      storeId: data.storeId ?? existing.storeId,
      item: data.item ?? existing.item,
      quantity,
      price,
      total,
      description: data.description ?? existing.description,
      updatedAt: now
    }

    try {
      const pool = getCloudDb().getPool()
      await pool.query(
        'UPDATE expenses SET category_id = $1, store_id = $2, item = $3, quantity = $4, price = $5, total = $6, description = $7, updated_at = $8 WHERE id = $9',
        [
          updated.categoryId,
          updated.storeId,
          updated.item,
          updated.quantity,
          updated.price,
          updated.total,
          updated.description,
          now,
          id
        ]
      )
      return updated
    } catch (error) {
      console.error('[ExpenseCloud] update error:', error)
      throw error
    }
  }

  async delete(id: string): Promise<void> {
    if (!this.isOnline()) {
      throw new Error('Offline mode not supported for expenses')
    }

    try {
      const pool = getCloudDb().getPool()
      await pool.query('DELETE FROM expenses WHERE id = $1', [id])
    } catch (error) {
      console.error('[ExpenseCloud] delete error:', error)
      throw error
    }
  }

  private mapCloudRow(row: Record<string, unknown>): Expense {
    return {
      id: row.id as string,
      shiftId: (row.shift_id as string) || null,
      categoryId: (row.category_id as string) || null,
      storeId: (row.store_id as string) || null,
      item: row.item as string,
      quantity: parseFloat(row.quantity as string) || 0,
      price: row.price as string,
      total: row.total as string,
      description: row.description as string | null,
      createdBy: row.created_by as string | null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string)
    }
  }
}
