import { Database } from 'sql.js'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'
import { CreateRoleDto, UpdateRoleDto } from '../types/dto'

export interface Role {
  id: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
  deviceId: string | null
}

export class RoleService {
  constructor(private db: Database) {}

  /**
   * Get all active (non-deleted) roles
   */
  async findAll(): Promise<Role[]> {
    const stmt = this.db.prepare('SELECT * FROM role WHERE deleted_at IS NULL ORDER BY name ASC')
    const results: Role[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToRole(row))
    }
    stmt.free()

    return results
  }

  /**
   * Get role by ID
   */
  async findById(id: string): Promise<Role | undefined> {
    const stmt = this.db.prepare('SELECT * FROM role WHERE id = ?')
    stmt.bind([id])

    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return this.mapRowToRole(row)
    }
    stmt.free()
    return undefined
  }

  /**
   * Create a new role
   */
  async create(data: CreateRoleDto): Promise<Role> {
    const id = randomUUID()
    const now = Date.now()

    this.db.run(
      'INSERT INTO role (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, data.name, data.description ?? null, now, now]
    )

    saveDb(this.db)

    return {
      id,
      name: data.name,
      description: data.description ?? null,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      syncedAt: null,
      deletedAt: null,
      deviceId: null
    }
  }

  /**
   * Update role
   */
  async update(id: string, data: UpdateRoleDto): Promise<Role> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new Error('Role not found')
    }

    const now = Date.now()
    const name = data.name ?? existing.name
    const description = data.description ?? existing.description

    this.db.run(
      'UPDATE role SET name = ?, description = ?, updated_at = ? WHERE id = ?',
      [name, description, now, id]
    )

    saveDb(this.db)

    const updated = await this.findById(id)
    if (!updated) {
      throw new Error('Role not found after update')
    }
    return updated
  }

  /**
   * Soft delete role
   */
  async softDelete(id: string): Promise<Role> {
    const now = Date.now()

    this.db.run('UPDATE role SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, id])

    saveDb(this.db)

    const deleted = await this.findById(id)
    if (!deleted) {
      throw new Error('Role not found after delete')
    }
    return deleted
  }

  /**
   * Restore soft-deleted role
   */
  async restore(id: string): Promise<Role> {
    const now = Date.now()

    this.db.run('UPDATE role SET deleted_at = NULL, updated_at = ? WHERE id = ?', [now, id])

    saveDb(this.db)

    const restored = await this.findById(id)
    if (!restored) {
      throw new Error('Role not found after restore')
    }
    return restored
  }

  /**
   * Helper to map DB row to Role
   */
  private mapRowToRole(row: any): Role {
    return {
      id: row.id as string,
      name: row.name as string,
      description: (row.description as string) ?? null,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null,
      deviceId: (row.device_id as string) ?? null
    }
  }
}
