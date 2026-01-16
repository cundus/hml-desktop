/* eslint-disable @typescript-eslint/no-explicit-any */
import { Database } from 'sql.js'
import { randomUUID } from 'crypto'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { QueueService } from './queue.service'
import { saveDb } from '../localDb'

export interface Expense {
  id: string
  shiftId: string
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
  shiftId: string
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
  private localDb: Database
  private queueService: QueueService

  constructor(localDb: Database, queueService: QueueService) {
    this.localDb = localDb
    this.queueService = queueService
  }

  private isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  async create(data: CreateExpenseDto): Promise<Expense> {
    const id = randomUUID()
    const now = new Date()
    const quantity = data.quantity ?? 1
    const total = (parseFloat(data.price) * quantity).toString()

    const expense: Expense = {
      id,
      shiftId: data.shiftId,
      item: data.item,
      quantity,
      price: data.price,
      total,
      description: data.description ?? null,
      createdBy: data.createdBy ?? null,
      createdAt: now,
      updatedAt: now
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'INSERT INTO expenses (id, shift_id, item, quantity, price, total, description, created_by, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          [
            id,
            data.shiftId,
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
        console.error('[ExpenseCloud] create error, queuing:', error)
      }
    }

    this.localDb.run(
      'INSERT INTO expenses (id, shift_id, item, quantity, price, total, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        data.shiftId,
        data.item,
        quantity,
        data.price,
        total,
        data.description ?? null,
        data.createdBy ?? null,
        now.getTime(),
        now.getTime()
      ]
    )
    saveDb(this.localDb)
    await this.queueService.add('INSERT', 'expenses', {
      id,
      shift_id: data.shiftId,
      item: data.item,
      quantity,
      price: data.price,
      total,
      description: data.description ?? null,
      created_by: data.createdBy ?? null,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    })
    return expense
  }

  async findById(id: string): Promise<Expense | null> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM expenses WHERE id = $1', [id])
        if (result.rows.length > 0) return this.mapCloudRow(result.rows[0])
      } catch (error) {
        console.error('[ExpenseCloud] findById error:', error)
      }
    }
    const stmt = this.localDb.prepare('SELECT * FROM expenses WHERE id = ?')
    stmt.bind([id])
    if (stmt.step()) {
      const e = this.mapLocalRow(stmt.getAsObject())
      stmt.free()
      return e
    }
    stmt.free()
    return null
  }

  async findAll(): Promise<Expense[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM expenses ORDER BY created_at DESC')
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[ExpenseCloud] findAll error:', error)
      }
    }
    const stmt = this.localDb.prepare('SELECT * FROM expenses ORDER BY created_at DESC')
    const results: Expense[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async findByShiftId(shiftId: string): Promise<Expense[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM expenses WHERE shift_id = $1 ORDER BY created_at DESC',
          [shiftId]
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[ExpenseCloud] findByShiftId error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM expenses WHERE shift_id = ? ORDER BY created_at DESC'
    )
    stmt.bind([shiftId])
    const results: Expense[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM expenses WHERE created_at >= $1 AND created_at <= $2 ORDER BY created_at DESC',
          [startDate, endDate]
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[ExpenseCloud] findByDateRange error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM expenses WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC'
    )
    stmt.bind([startDate.getTime(), endDate.getTime()])
    const results: Expense[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async getExpenseSummaryByShift(shiftId: string): Promise<ExpenseSummary> {
    if (this.isOnline()) {
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
      } catch (error) {
        console.error('[ExpenseCloud] getExpenseSummaryByShift error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT COUNT(*) as count, COALESCE(SUM(CAST(total AS REAL)), 0) as total FROM expenses WHERE shift_id = ?'
    )
    stmt.bind([shiftId])
    if (stmt.step()) {
      const result = stmt.getAsObject()
      stmt.free()
      return {
        totalExpenses: String((result.total as number) || 0),
        expenseCount: (result.count as number) || 0
      }
    }
    stmt.free()
    return { totalExpenses: '0', expenseCount: 0 }
  }

  async getExpenseSummaryByDateRange(startDate: Date, endDate: Date): Promise<ExpenseSummary> {
    if (this.isOnline()) {
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
      } catch (error) {
        console.error('[ExpenseCloud] getExpenseSummaryByDateRange error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT COUNT(*) as count, COALESCE(SUM(CAST(total AS REAL)), 0) as total FROM expenses WHERE created_at >= ? AND created_at <= ?'
    )
    stmt.bind([startDate.getTime(), endDate.getTime()])
    if (stmt.step()) {
      const result = stmt.getAsObject() as { total: number; count: number }
      stmt.free()
      return { totalExpenses: String(result.total || 0), expenseCount: result.count || 0 }
    }
    stmt.free()
    return { totalExpenses: '0', expenseCount: 0 }
  }

  async update(id: string, data: Partial<CreateExpenseDto>): Promise<Expense> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('Expense not found')

    const now = new Date()
    const quantity = data.quantity ?? existing.quantity
    const price = data.price ?? existing.price
    const total = (parseFloat(price) * quantity).toString()

    const updated: Expense = {
      ...existing,
      item: data.item ?? existing.item,
      quantity,
      price,
      total,
      description: data.description ?? existing.description,
      updatedAt: now
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'UPDATE expenses SET item = $1, quantity = $2, price = $3, total = $4, description = $5, updated_at = $6 WHERE id = $7',
          [
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
        console.error('[ExpenseCloud] update error, queuing:', error)
      }
    }

    this.localDb.run(
      'UPDATE expenses SET item = ?, quantity = ?, price = ?, total = ?, description = ?, updated_at = ? WHERE id = ?',
      [
        updated.item,
        updated.quantity,
        updated.price,
        updated.total,
        updated.description,
        now.getTime(),
        id
      ]
    )
    saveDb(this.localDb)
    await this.queueService.add('UPDATE', 'expenses', {
      id,
      item: updated.item,
      quantity: updated.quantity,
      price: updated.price,
      total: updated.total,
      description: updated.description,
      updated_at: now.toISOString()
    })
    return updated
  }

  async delete(id: string): Promise<void> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('DELETE FROM expenses WHERE id = $1', [id])
      } catch (error) {
        console.error('[ExpenseCloud] delete error:', error)
      }
    }
    this.localDb.run('DELETE FROM expenses WHERE id = ?', [id])
    saveDb(this.localDb)
  }

  private mapCloudRow(row: Record<string, unknown>): Expense {
    return {
      id: row.id as string,
      shiftId: row.shift_id as string,
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

  private mapLocalRow(row: Record<string, unknown>): Expense {
    return {
      id: row.id as string,
      shiftId: row.shift_id as string,
      item: row.item as string,
      quantity: row.quantity as number,
      price: row.price as string,
      total: row.total as string,
      description: row.description as string | null,
      createdBy: row.created_by as string | null,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number)
    }
  }
}
