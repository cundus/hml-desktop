import { Database } from 'sql.js'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'

export interface PaymentMethod {
  id: string
  name: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
}

export interface CreatePaymentMethodDto {
  name: string
  isActive?: boolean
}

export interface UpdatePaymentMethodDto {
  name?: string
  isActive?: boolean
}

export class PaymentMethodService {
  constructor(private db: Database) {}

  /**
   * Get all active (non-deleted) payment methods
   */
  async findAll(): Promise<PaymentMethod[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM payment_method WHERE deleted_at IS NULL ORDER BY name ASC'
    )
    const results: PaymentMethod[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToPaymentMethod(row))
    }
    stmt.free()

    return results
  }

  /**
   * Get only active payment methods (for dropdown)
   */
  async findActive(): Promise<PaymentMethod[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM payment_method WHERE deleted_at IS NULL AND is_active = 1 ORDER BY name ASC'
    )
    const results: PaymentMethod[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToPaymentMethod(row))
    }
    stmt.free()

    return results
  }

  /**
   * Get payment method by ID
   */
  async findById(id: string): Promise<PaymentMethod | undefined> {
    const stmt = this.db.prepare('SELECT * FROM payment_method WHERE id = ?')
    stmt.bind([id])

    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return this.mapRowToPaymentMethod(row)
    }
    stmt.free()
    return undefined
  }

  /**
   * Create a new payment method
   */
  async create(data: CreatePaymentMethodDto): Promise<PaymentMethod> {
    const id = randomUUID()
    const now = Date.now()

    this.db.run(
      'INSERT INTO payment_method (id, name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, data.name, data.isActive !== false ? 1 : 0, now, now]
    )

    saveDb(this.db)

    return {
      id,
      name: data.name,
      isActive: data.isActive !== false,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      syncedAt: null,
      deletedAt: null
    }
  }

  /**
   * Update payment method
   */
  async update(id: string, data: UpdatePaymentMethodDto): Promise<PaymentMethod> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new Error('Payment method not found')
    }

    const now = Date.now()

    this.db.run(
      'UPDATE payment_method SET name = ?, is_active = ?, updated_at = ? WHERE id = ?',
      [
        data.name ?? existing.name,
        data.isActive !== undefined ? (data.isActive ? 1 : 0) : (existing.isActive ? 1 : 0),
        now,
        id
      ]
    )

    saveDb(this.db)

    const updated = await this.findById(id)
    if (!updated) {
      throw new Error('Payment method not found after update')
    }
    return updated
  }

  /**
   * Soft delete payment method
   */
  async softDelete(id: string): Promise<PaymentMethod> {
    const now = Date.now()

    this.db.run('UPDATE payment_method SET deleted_at = ?, updated_at = ? WHERE id = ?', [
      now,
      now,
      id
    ])

    saveDb(this.db)

    const deleted = await this.findById(id)
    if (!deleted) {
      throw new Error('Payment method not found after delete')
    }
    return deleted
  }

  /**
   * Map database row to PaymentMethod object
   */
  private mapRowToPaymentMethod(row: any): PaymentMethod {
    return {
      id: row.id as string,
      name: row.name as string,
      isActive: row.is_active === 1,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null
    }
  }
}
