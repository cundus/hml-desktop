/* eslint-disable @typescript-eslint/no-explicit-any */
import { Database } from 'sql.js'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'

export interface Expense {
  id: string
  shiftId: string
  item: string
  quantity: number
  price: string
  total: string
  description: string | null
  createdBy: string | null
  expenseDate: Date
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
  expenseDate?: string
}

export interface ExpenseSummary {
  totalExpenses: string
  expenseCount: number
}

export class ExpenseService {
  constructor(private db: Database) {}

  /**
   * Create a new expense
   */
  async create(data: CreateExpenseDto): Promise<Expense> {
    const id = randomUUID()
    const now = Date.now()
    const quantity = data.quantity ?? 1
    const total = (parseFloat(data.price) * quantity).toString()
    const expenseDate = data.expenseDate ? new Date(data.expenseDate).getTime() : now

    this.db.run(
      'INSERT INTO expenses (id, shift_id, item, quantity, price, total, description, created_by, expense_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        data.shiftId,
        data.item,
        quantity,
        data.price,
        total,
        data.description ?? null,
        data.createdBy ?? null,
        expenseDate,
        now,
        now
      ]
    )

    saveDb(this.db)

    const created = await this.findById(id)
    if (!created) {
      throw new Error('Expense not found after creation')
    }
    return created
  }

  /**
   * Get expense by ID
   */
  async findById(id: string): Promise<Expense | null> {
    const stmt = this.db.prepare('SELECT * FROM expenses WHERE id = ?')
    stmt.bind([id])

    if (stmt.step()) {
      const result = stmt.getAsObject()
      stmt.free()
      return this.mapRowToExpense(result)
    }
    stmt.free()
    return null
  }

  /**
   * Get all expenses
   */
  async findAll(): Promise<Expense[]> {
    const stmt = this.db.prepare('SELECT * FROM expenses ORDER BY created_at DESC')
    const results: Expense[] = []

    while (stmt.step()) {
      const result = stmt.getAsObject()
      results.push(this.mapRowToExpense(result))
    }
    stmt.free()

    return results
  }

  /**
   * Get expenses by shift ID
   */
  async findByShiftId(shiftId: string): Promise<Expense[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM expenses WHERE shift_id = ? ORDER BY created_at DESC'
    )
    stmt.bind([shiftId])
    const results: Expense[] = []

    while (stmt.step()) {
      const result = stmt.getAsObject()
      results.push(this.mapRowToExpense(result))
    }
    stmt.free()

    return results
  }

  /**
   * Get expenses by date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM expenses WHERE expense_date >= ? AND expense_date <= ? ORDER BY expense_date DESC'
    )
    stmt.bind([startDate.getTime(), endDate.getTime()])
    const results: Expense[] = []

    while (stmt.step()) {
      const result = stmt.getAsObject()
      results.push(this.mapRowToExpense(result))
    }
    stmt.free()

    return results
  }

  /**
   * Get expense summary for a shift
   */
  async getExpenseSummaryByShift(shiftId: string): Promise<ExpenseSummary> {
    const stmt = this.db.prepare(
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

    return {
      totalExpenses: '0',
      expenseCount: 0
    }
  }

  /**
   * Get expense summary for a date range
   */
  async getExpenseSummaryByDateRange(startDate: Date, endDate: Date): Promise<ExpenseSummary> {
    const stmt = this.db.prepare(
      'SELECT COUNT(*) as count, COALESCE(SUM(CAST(total AS REAL)), 0) as total FROM expenses WHERE expense_date >= ? AND expense_date <= ?'
    )
    stmt.bind([startDate.getTime(), endDate.getTime()])

    if (stmt.step()) {
      const result = stmt.getAsObject() as { total: number; count: number }
      stmt.free()
      return {
        totalExpenses: String(result.total || 0),
        expenseCount: result.count || 0
      }
    }
    stmt.free()

    return {
      totalExpenses: '0',
      expenseCount: 0
    }
  }

  /**
   * Update an expense
   */
  async update(id: string, data: Partial<CreateExpenseDto>): Promise<Expense> {
    const now = Date.now()

    // Build dynamic update query
    const updateFields: string[] = []
    const updateValues: any[] = []

    if (data.item !== undefined) {
      updateFields.push('item = ?')
      updateValues.push(data.item)
    }
    if (data.quantity !== undefined) {
      updateFields.push('quantity = ?')
      updateValues.push(data.quantity)
    }
    if (data.price !== undefined) {
      updateFields.push('price = ?')
      updateValues.push(data.price)
    }
    if (data.description !== undefined) {
      updateFields.push('description = ?')
      updateValues.push(data.description)
    }
    if (data.expenseDate !== undefined) {
      updateFields.push('expense_date = ?')
      updateValues.push(new Date(data.expenseDate).getTime())
    }

    // Recalculate total if quantity or price changed
    if (data.quantity !== undefined || data.price !== undefined) {
      const currentExpense = await this.findById(id)
      if (!currentExpense) {
        throw new Error('Expense not found')
      }

      const quantity = data.quantity ?? currentExpense.quantity
      const price = data.price ?? currentExpense.price
      const total = (parseFloat(price) * quantity).toString()

      updateFields.push('total = ?')
      updateValues.push(total)
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update')
    }

    updateFields.push('updated_at = ?')
    updateValues.push(now)
    updateValues.push(id)

    this.db.run(`UPDATE expenses SET ${updateFields.join(', ')} WHERE id = ?`, updateValues)

    saveDb(this.db)

    const updated = await this.findById(id)
    if (!updated) {
      throw new Error('Expense not found after update')
    }
    return updated
  }

  /**
   * Delete an expense
   */
  async delete(id: string): Promise<void> {
    this.db.run('DELETE FROM expenses WHERE id = ?', [id])
    saveDb(this.db)
  }

  /**
   * Map database row to Expense object
   */
  private mapRowToExpense(row: any): Expense {
    return {
      id: row.id as string,
      shiftId: row.shift_id as string,
      item: row.item as string,
      quantity: row.quantity as number,
      price: row.price as string,
      total: row.total as string,
      description: row.description as string | null,
      createdBy: row.created_by as string | null,
      expenseDate: new Date((row.expense_date as number) || (row.created_at as number)),
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number)
    }
  }
}
