---
name: cloud-first-service
description: Create a cloud-first service that queries PostgreSQL first, falls back to local SQLite, and queues offline writes
---

# Cloud-First Service Skill

This skill guides creating a new cloud-first service that follows the project's dual-database pattern.

## When to Use
Use this when creating a new domain entity service that needs both cloud (PostgreSQL) and local (SQLite) database access with offline support.

## Architecture

```
CloudFirstBaseService (abstract)
  ├── isOnline()        → checks connectivity
  ├── getPool()         → returns PG Pool
  ├── queueOperation()  → queues for offline sync
  └── abstract methods  → findAll, findById, create, update, softDelete
```

## Step-by-Step

### 1. Define Types

```typescript
// src/main/services/<entity>-cloud.service.ts

export interface <Entity> {
  id: string
  name: string
  // ... domain fields
  isDeleted: boolean
  syncedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface Create<Entity>Dto {
  name: string
  // ... required fields for creation
}

export type Update<Entity>Dto = Partial<Create<Entity>Dto>
```

### 2. Create the Cloud-First Service

```typescript
import { CloudFirstBaseService } from './cloud-first-base.service'
import { QueueService } from './queue.service'
import { Database } from 'sql.js'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'

export class <Entity>CloudService extends CloudFirstBaseService<
  <Entity>,
  Create<Entity>Dto,
  Update<Entity>Dto
> {
  protected tableName = '<entity>'
  protected entityName = '<entity>'

  constructor(localDb: Database, queueService: QueueService) {
    super(localDb, queueService)
  }

  async findAll(): Promise<<Entity>[]> {
    if (this.isOnline()) {
      try {
        const pool = this.getPool()
        const result = await pool.query(
          `SELECT * FROM ${this.quoteTable(this.tableName)} WHERE is_deleted = false ORDER BY created_at DESC`
        )
        // Sync to local
        this.syncToLocal(result.rows)
        return result.rows.map(this.mapRow)
      } catch (error) {
        console.warn(`Cloud ${this.entityName} query failed, falling back to local`, error)
      }
    }
    // Local fallback
    return this.findAllLocal()
  }

  async findById(id: string): Promise<<Entity> | undefined> {
    if (this.isOnline()) {
      try {
        const pool = this.getPool()
        const result = await pool.query(
          `SELECT * FROM ${this.quoteTable(this.tableName)} WHERE id = $1 AND is_deleted = false`,
          [id]
        )
        if (result.rows.length > 0) return this.mapRow(result.rows[0])
      } catch (error) {
        console.warn(`Cloud ${this.entityName} findById failed`, error)
      }
    }
    return this.findByIdLocal(id)
  }

  async create(data: Create<Entity>Dto): Promise<<Entity>> {
    const id = randomUUID()
    const now = new Date()

    if (this.isOnline()) {
      try {
        const pool = this.getPool()
        const result = await pool.query(
          `INSERT INTO ${this.quoteTable(this.tableName)} (id, name, created_at, updated_at)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [id, data.name, now, now]
        )
        const entity = this.mapRow(result.rows[0])
        this.saveToLocal(entity) // Save to local as cache
        return entity
      } catch (error) {
        console.warn(`Cloud create failed, queueing`, error)
      }
    }

    // Queue for later sync
    await this.queueOperation('create', { id, ...data })
    // Save locally
    return this.createLocal(id, data, now)
  }

  async update(id: string, data: Update<Entity>Dto): Promise<<Entity>> {
    if (this.isOnline()) {
      try {
        // Build dynamic SET clause for PG
        const pool = this.getPool()
        // ... update query
      } catch (error) {
        console.warn(`Cloud update failed, queueing`, error)
      }
    }
    await this.queueOperation('update', { id, ...data })
    return this.updateLocal(id, data)
  }

  async softDelete(id: string): Promise<<Entity>> {
    if (this.isOnline()) {
      try {
        const pool = this.getPool()
        const result = await pool.query(
          `UPDATE ${this.quoteTable(this.tableName)} SET is_deleted = true, updated_at = $1 WHERE id = $2 RETURNING *`,
          [new Date(), id]
        )
        return this.mapRow(result.rows[0])
      } catch (error) {
        console.warn(`Cloud softDelete failed, queueing`, error)
      }
    }
    await this.queueOperation('delete', { id })
    return this.softDeleteLocal(id)
  }

  // Helper: map PG row to typed object
  private mapRow(row: any): <Entity> {
    return {
      id: row.id,
      name: row.name,
      isDeleted: row.is_deleted,
      syncedAt: this.toDate(row.synced_at),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  // ... local fallback methods (findAllLocal, createLocal, etc.)
}
```

## Key Patterns

1. **Always try cloud first**: `if (this.isOnline()) { try { ... } catch { fallback } }`
2. **Queue offline writes**: `this.queueOperation(action, payload)` when cloud fails
3. **Map rows consistently**: Transform snake_case DB columns → camelCase TypeScript
4. **Financial reports NEVER fall back**: Throw error instead of returning stale local data
5. **Sync to local**: After successful cloud reads, mirror data locally for offline access
