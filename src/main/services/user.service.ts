import { Database } from 'sql.js'
import { CreateUserDto, UpdateUserDto } from '../types/dto'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'

export interface User {
  id: string
  name: string
  email: string
  password: string
  pin: string | null
  storeId: string | null
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
  deviceId: string | null
}

export class UserService {
  constructor(private db: Database) {}

  /**
   * Get all active (non-deleted) users
   */
  async findAll(): Promise<User[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM user WHERE deleted_at IS NULL ORDER BY created_at DESC'
    )
    const results: User[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToUser(row))
    }
    stmt.free()

    return results
  }

  /**
   * Get user by ID
   */
  async findById(id: string): Promise<User | undefined> {
    const stmt = this.db.prepare('SELECT * FROM user WHERE id = ?')
    stmt.bind([id])

    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return this.mapRowToUser(row)
    }
    stmt.free()
    return undefined
  }

  /**
   * Get user by email
   */
  async findByEmail(email: string): Promise<User | undefined> {
    const stmt = this.db.prepare('SELECT * FROM user WHERE email = ? AND deleted_at IS NULL')
    stmt.bind([email])

    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return this.mapRowToUser(row)
    }
    stmt.free()
    return undefined
  }

  /**
   * Create a new user
   */
  async create(data: CreateUserDto): Promise<User> {
    const id = randomUUID()
    const now = Date.now()

    this.db.run(
      'INSERT INTO user (id, name, email, password, store_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, data.name, data.email, data.password, data.storeId ?? null, now, now]
    )

    saveDb(this.db)

    return {
      id,
      name: data.name,
      email: data.email,
      password: data.password,
      pin: null,
      storeId: data.storeId ?? null,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      syncedAt: null,
      deletedAt: null,
      deviceId: null
    }
  }

  /**
   * Update user
   */
  async update(id: string, data: UpdateUserDto): Promise<User> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new Error('User not found')
    }

    const now = Date.now()

    const name = data.name ?? existing.name
    const email = data.email ?? existing.email
    const password = data.password ?? existing.password

    let storeId: string | null
    if ('storeId' in data) {
      storeId = data.storeId && data.storeId.length > 0 ? data.storeId : null
    } else {
      storeId = existing.storeId
    }

    this.db.run(
      'UPDATE user SET name = ?, email = ?, password = ?, store_id = ?, updated_at = ? WHERE id = ?',
      [name, email, password, storeId ?? null, now, id]
    )

    saveDb(this.db)

    const updated = await this.findById(id)
    if (!updated) {
      throw new Error('User not found after update')
    }
    return updated
  }

  /**
   * Soft delete user
   */
  async softDelete(id: string): Promise<User> {
    const now = Date.now()

    this.db.run('UPDATE user SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, id])

    saveDb(this.db)

    const deleted = await this.findById(id)
    if (!deleted) {
      throw new Error('User not found after delete')
    }
    return deleted
  }

  /**
   * Permanently delete user
   */
  async hardDelete(id: string): Promise<void> {
    this.db.run('DELETE FROM user WHERE id = ?', [id])
    saveDb(this.db)
  }

  /**
   * Restore soft-deleted user
   */
  async restore(id: string): Promise<User> {
    const now = Date.now()

    this.db.run('UPDATE user SET deleted_at = NULL, updated_at = ? WHERE id = ?', [now, id])

    saveDb(this.db)

    const restored = await this.findById(id)
    if (!restored) {
      throw new Error('User not found after restore')
    }
    return restored
  }

  /**
   * Update user PIN
   */
  async updatePin(id: string, pin: string | null): Promise<User> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new Error('User not found')
    }

    const now = Date.now()
    this.db.run('UPDATE user SET pin = ?, updated_at = ? WHERE id = ?', [pin, now, id])

    saveDb(this.db)

    const updated = await this.findById(id)
    if (!updated) {
      throw new Error('User not found after update')
    }
    return updated
  }

  /**
   * Check if user has PIN set
   */
  async hasPin(id: string): Promise<boolean> {
    const stmt = this.db.prepare('SELECT pin FROM user WHERE id = ? AND deleted_at IS NULL')
    stmt.bind([id])

    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return !!row.pin
    }
    stmt.free()
    return false
  }

  /**
   * Map database row to User object
   */
  private mapRowToUser(row: any): User {
    return {
      id: row.id as string,
      name: row.name as string,
      email: row.email as string,
      password: row.password as string,
      pin: (row.pin as string) || null,
      storeId: row.store_id as string | null,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null,
      deviceId: row.device_id as string | null
    }
  }
}
