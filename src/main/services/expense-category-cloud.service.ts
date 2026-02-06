import { Database } from 'sql.js'
import { randomUUID } from 'crypto'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { QueueService } from './queue.service'
import { saveDb } from '../localDb'

export interface ExpenseCategory {
  id: string
  code: string
  name: string
  type: 'shift' | 'operational'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateExpenseCategoryDto {
  code: string
  name: string
  type: 'shift' | 'operational'
  isActive?: boolean
}

export interface UpdateExpenseCategoryDto {
  code?: string
  name?: string
  type?: 'shift' | 'operational'
  isActive?: boolean
}

export class ExpenseCategoryCloudService {
  private localDb: Database
  private queueService: QueueService

  constructor(localDb: Database, queueService: QueueService) {
    this.localDb = localDb
    this.queueService = queueService
  }

  private isOnline(): boolean {
    return getConnectivity().isOnline() && getCloudDb().isConnected()
  }

  async getAll(): Promise<ExpenseCategory[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          `SELECT id, code, name, type, is_active, created_at, updated_at
             FROM expense_category
            WHERE deleted_at IS NULL
            ORDER BY type, name`
        )
        return result.rows.map(this.mapFromCloud)
      } catch (error) {
        console.error('[ExpenseCategoryCloud] getAll error:', error)
      }
    }

    const stmt = this.localDb.prepare(
      `SELECT id, code, name, type, is_active, created_at, updated_at
         FROM expense_category
        WHERE deleted_at IS NULL
        ORDER BY type, name`
    )
    const results: ExpenseCategory[] = []
    while (stmt.step()) {
      results.push(this.mapFromLocal(stmt.getAsObject()))
    }
    stmt.free()
    return results
  }

  async getByType(type: 'shift' | 'operational'): Promise<ExpenseCategory[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          `SELECT id, code, name, type, is_active, created_at, updated_at
             FROM expense_category
            WHERE deleted_at IS NULL AND type = $1 AND is_active = true
            ORDER BY name`,
          [type]
        )
        return result.rows.map(this.mapFromCloud)
      } catch (error) {
        console.error('[ExpenseCategoryCloud] getByType error:', error)
      }
    }

    const stmt = this.localDb.prepare(
      `SELECT id, code, name, type, is_active, created_at, updated_at
         FROM expense_category
        WHERE deleted_at IS NULL AND type = ? AND is_active = 1
        ORDER BY name`
    )
    stmt.bind([type])
    const results: ExpenseCategory[] = []
    while (stmt.step()) {
      results.push(this.mapFromLocal(stmt.getAsObject()))
    }
    stmt.free()
    return results
  }

  async findById(id: string): Promise<ExpenseCategory | null> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          `SELECT id, code, name, type, is_active, created_at, updated_at
             FROM expense_category WHERE id = $1 AND deleted_at IS NULL`,
          [id]
        )
        if (result.rows.length > 0) {
          return this.mapFromCloud(result.rows[0])
        }
        return null
      } catch (error) {
        console.error('[ExpenseCategoryCloud] findById error:', error)
      }
    }

    const stmt = this.localDb.prepare(
      `SELECT id, code, name, type, is_active, created_at, updated_at
         FROM expense_category WHERE id = ? AND deleted_at IS NULL`
    )
    stmt.bind([id])
    if (stmt.step()) {
      const result = this.mapFromLocal(stmt.getAsObject())
      stmt.free()
      return result
    }
    stmt.free()
    return null
  }

  async create(data: CreateExpenseCategoryDto): Promise<ExpenseCategory> {
    const id = randomUUID()
    const now = new Date().toISOString()
    const isActive = data.isActive ?? true

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          `INSERT INTO expense_category (id, code, name, type, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, data.code, data.name, data.type, isActive, now, now]
        )
      } catch (error) {
        console.error('[ExpenseCategoryCloud] create cloud error:', error)
      }
    }

    this.localDb.run(
      `INSERT INTO expense_category (id, code, name, type, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, data.code, data.name, data.type, isActive ? 1 : 0, now, now]
    )
    saveDb(this.localDb)

    this.queueService.add('INSERT', 'expense_category', {
      id,
      code: data.code,
      name: data.name,
      type: data.type,
      is_active: isActive,
      created_at: now,
      updated_at: now
    })

    return {
      id,
      code: data.code,
      name: data.name,
      type: data.type,
      isActive,
      createdAt: new Date(now),
      updatedAt: new Date(now)
    }
  }

  async update(id: string, data: UpdateExpenseCategoryDto): Promise<ExpenseCategory | null> {
    const existing = await this.findById(id)
    if (!existing) return null

    const now = new Date().toISOString()
    const updated = {
      code: data.code ?? existing.code,
      name: data.name ?? existing.name,
      type: data.type ?? existing.type,
      isActive: data.isActive ?? existing.isActive
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          `UPDATE expense_category SET code = $1, name = $2, type = $3, is_active = $4, updated_at = $5 WHERE id = $6`,
          [updated.code, updated.name, updated.type, updated.isActive, now, id]
        )
      } catch (error) {
        console.error('[ExpenseCategoryCloud] update cloud error:', error)
      }
    }

    this.localDb.run(
      `UPDATE expense_category SET code = ?, name = ?, type = ?, is_active = ?, updated_at = ? WHERE id = ?`,
      [updated.code, updated.name, updated.type, updated.isActive ? 1 : 0, now, id]
    )
    saveDb(this.localDb)

    this.queueService.add('UPDATE', 'expense_category', {
      id,
      code: updated.code,
      name: updated.name,
      type: updated.type,
      is_active: updated.isActive,
      updated_at: now
    })

    return {
      ...existing,
      ...updated,
      updatedAt: new Date(now)
    }
  }

  async delete(id: string): Promise<boolean> {
    const now = new Date().toISOString()

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          `UPDATE expense_category SET deleted_at = $1, updated_at = $1 WHERE id = $2`,
          [now, id]
        )
      } catch (error) {
        console.error('[ExpenseCategoryCloud] delete cloud error:', error)
      }
    }

    this.localDb.run(
      `UPDATE expense_category SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, id]
    )
    saveDb(this.localDb)

    this.queueService.add('UPDATE', 'expense_category', {
      id,
      deleted_at: now,
      updated_at: now
    })

    return true
  }

  private mapFromCloud(row: Record<string, unknown>): ExpenseCategory {
    return {
      id: row.id as string,
      code: row.code as string,
      name: row.name as string,
      type: row.type as 'shift' | 'operational',
      isActive: row.is_active === true,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string)
    }
  }

  private mapFromLocal(row: Record<string, unknown>): ExpenseCategory {
    return {
      id: row.id as string,
      code: row.code as string,
      name: row.name as string,
      type: row.type as 'shift' | 'operational',
      isActive: (row.is_active as number) === 1,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string)
    }
  }
}
