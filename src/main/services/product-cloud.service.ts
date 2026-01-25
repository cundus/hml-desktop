import { Database } from 'sql.js'
import { CreateProductDto, UpdateProductDto } from '../types/dto'
import { randomUUID } from 'crypto'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { QueueService } from './queue.service'
import { saveDb } from '../localDb'

export interface Product {
  id: string
  sku: string
  name: string
  description: string | null
  unit: string
  cost: string
  weight: string
  categoryId: string | null
  supplierId: string | null
  isService: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
  deviceId: string | null
}

export class ProductCloudService {
  private localDb: Database
  private queueService: QueueService

  constructor(localDb: Database, queueService: QueueService) {
    this.localDb = localDb
    this.queueService = queueService
  }
  private isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  async findAll(): Promise<Product[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM product WHERE deleted_at IS NULL ORDER BY name ASC'
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[ProductCloud] findAll error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM product WHERE deleted_at IS NULL ORDER BY name ASC'
    )
    const results: Product[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async findActive(): Promise<Product[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM product WHERE deleted_at IS NULL AND is_active = true ORDER BY name ASC'
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[ProductCloud] findActive error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM product WHERE deleted_at IS NULL AND is_active = 1 ORDER BY name ASC'
    )
    const results: Product[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async findById(id: string): Promise<Product | undefined> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM product WHERE id = $1', [id])
        if (result.rows.length > 0) return this.mapCloudRow(result.rows[0])
      } catch (error) {
        console.error('[ProductCloud] findById error:', error)
      }
    }
    const stmt = this.localDb.prepare('SELECT * FROM product WHERE id = ?')
    stmt.bind([id])
    if (stmt.step()) {
      const p = this.mapLocalRow(stmt.getAsObject())
      stmt.free()
      return p
    }
    stmt.free()
    return undefined
  }

  async findBySku(sku: string): Promise<Product | undefined> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM product WHERE sku = $1 AND deleted_at IS NULL',
          [sku]
        )
        if (result.rows.length > 0) return this.mapCloudRow(result.rows[0])
      } catch (error) {
        console.error('[ProductCloud] findBySku error:', error)
      }
    }
    const stmt = this.localDb.prepare('SELECT * FROM product WHERE sku = ? AND deleted_at IS NULL')
    stmt.bind([sku])
    if (stmt.step()) {
      const p = this.mapLocalRow(stmt.getAsObject())
      stmt.free()
      return p
    }
    stmt.free()
    return undefined
  }

  async search(query: string): Promise<Product[]> {
    const searchPattern = `%${query}%`
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM product WHERE deleted_at IS NULL AND (name ILIKE $1 OR sku ILIKE $2) LIMIT 50',
          [searchPattern, searchPattern]
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[ProductCloud] search error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM product WHERE deleted_at IS NULL AND (name LIKE ? OR sku LIKE ?) LIMIT 50'
    )
    stmt.bind([searchPattern, searchPattern])
    const results: Product[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async create(data: CreateProductDto): Promise<Product> {
    const id = randomUUID()
    const now = new Date()
    const product: Product = {
      id,
      sku: data.sku,
      name: data.name,
      description: data.description ?? null,
      unit: data.unit,
      cost: data.cost.toString(),
      weight: (data.weight ?? 0).toString(),
      categoryId: data.categoryId ?? null,
      supplierId: data.supplierId ?? null,
      isService: data.isService ?? false,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
      syncedAt: null,
      deletedAt: null,
      deviceId: null
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'INSERT INTO product (id, sku, name, description, unit, cost, weight, category_id, supplier_id, is_service, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
          [
            id,
            data.sku,
            data.name,
            product.description,
            data.unit,
            data.cost,
            data.weight ?? 0,
            product.categoryId,
            product.supplierId,
            product.isService,
            product.isActive,
            now,
            now
          ]
        )
        // Auto-create base UOM in cloud
        const uomResult = await pool.query(
          'SELECT id FROM uom WHERE lower(code) = lower($1) LIMIT 1',
          [data.unit]
        )
        if (uomResult.rows.length > 0) {
          const uomId = uomResult.rows[0].id as string
          const productUomId = randomUUID()
          await pool.query(
            'INSERT INTO product_uom (id, product_id, uom_id, conversion_factor, is_base_unit, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [productUomId, id, uomId, 1, true, now, now]
          )
        }

        // SYNC TO LOCAL DB IMMEDIATELY (Required for PricingService to find FK)
        try {
          this.localDb.run(
            'INSERT INTO product (id, sku, name, description, unit, cost, weight, category_id, supplier_id, is_service, is_active, created_at, updated_at, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              id,
              data.sku,
              data.name,
              product.description,
              data.unit,
              data.cost,
              data.weight ?? 0,
              product.categoryId,
              product.supplierId,
              product.isService ? 1 : 0,
              product.isActive ? 1 : 0,
              now.getTime(),
              now.getTime(),
              now.getTime() // Mark as synced
            ]
          )
          // Auto-create base UOM locally
          const uomStmt = this.localDb.prepare(
            'SELECT id FROM uom WHERE lower(code) = lower(?) LIMIT 1'
          )
          uomStmt.bind([data.unit])
          if (uomStmt.step()) {
            const uomId = uomStmt.getAsObject().id as string
            // const productUomId = randomUUID() // Use new ID or same? Cloud used randomUUID(). Ideally consistent but Local FKs don't care about UOM ID, only Product ID?
            // Actually PricingService uses uom_id (from master uom). product_uom id is less critical unless synced?
            // Let's generate new ID or share? If we don't save productUomId from Cloud, we can't match?
            // Code: const productUomId = randomUUID().
            // We should ideally return full structure.
            // But for now, separate ID is fine as long as logic holds.
            this.localDb.run(
              'INSERT INTO product_uom (id, product_id, uom_id, conversion_factor, is_base_unit, created_at, updated_at, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [randomUUID(), id, uomId, 1, 1, now.getTime(), now.getTime(), now.getTime()]
            )
          }
          uomStmt.free()
          saveDb(this.localDb)
        } catch (localErr) {
          console.error('[ProductCloud] Failed to sync local after cloud create:', localErr)
        }

        return product
      } catch (error) {
        console.error('[ProductCloud] create error, queuing:', error)
      }
    }

    this.localDb.run(
      'INSERT INTO product (id, sku, name, description, unit, cost, weight, category_id, supplier_id, is_service, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        data.sku,
        data.name,
        product.description,
        data.unit,
        data.cost,
        data.weight ?? 0,
        product.categoryId,
        product.supplierId,
        product.isService ? 1 : 0,
        product.isActive ? 1 : 0,
        now.getTime(),
        now.getTime()
      ]
    )
    // Auto-create base UOM locally
    const uomStmt = this.localDb.prepare('SELECT id FROM uom WHERE lower(code) = lower(?) LIMIT 1')
    uomStmt.bind([data.unit])
    if (uomStmt.step()) {
      const uomId = uomStmt.getAsObject().id as string
      const productUomId = randomUUID()
      this.localDb.run(
        'INSERT INTO product_uom (id, product_id, uom_id, conversion_factor, is_base_unit, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [productUomId, id, uomId, 1, 1, now.getTime(), now.getTime()]
      )
    }
    uomStmt.free()
    saveDb(this.localDb)
    await this.queueService.add('INSERT', 'product', {
      id,
      sku: data.sku,
      name: data.name,
      description: product.description,
      unit: data.unit,
      cost: data.cost,
      weight: data.weight ?? 0,
      category_id: product.categoryId,
      supplier_id: product.supplierId,
      is_service: product.isService,
      is_active: product.isActive,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    })
    return product
  }

  async update(id: string, data: UpdateProductDto): Promise<Product> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('Product not found')
    const now = new Date()
    const cost = data.cost !== undefined ? String(data.cost) : existing.cost
    const weight = data.weight !== undefined ? String(data.weight) : existing.weight
    const updated: Product = {
      ...existing,
      name: data.name ?? existing.name,
      description: data.description ?? existing.description,
      unit: data.unit ?? existing.unit,
      cost,
      weight,
      categoryId: data.categoryId ?? existing.categoryId,
      supplierId: data.supplierId ?? existing.supplierId,
      isService: data.isService ?? existing.isService,
      isActive: data.isActive ?? existing.isActive,
      updatedAt: now
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'UPDATE product SET name = $1, description = $2, unit = $3, cost = $4, weight = $5, category_id = $6, supplier_id = $7, is_service = $8, is_active = $9, updated_at = $10 WHERE id = $11',
          [
            updated.name,
            updated.description,
            updated.unit,
            updated.cost,
            updated.weight,
            updated.categoryId,
            updated.supplierId,
            updated.isService,
            updated.isActive,
            now,
            id
          ]
        )
        return updated
      } catch (error) {
        console.error('[ProductCloud] update error, queuing:', error)
      }
    }

    this.localDb.run(
      'UPDATE product SET name = ?, description = ?, unit = ?, cost = ?, weight = ?, category_id = ?, supplier_id = ?, is_service = ?, is_active = ?, updated_at = ? WHERE id = ?',
      [
        updated.name,
        updated.description,
        updated.unit,
        updated.cost,
        updated.weight,
        updated.categoryId,
        updated.supplierId,
        updated.isService ? 1 : 0,
        updated.isActive ? 1 : 0,
        now.getTime(),
        id
      ]
    )
    saveDb(this.localDb)
    await this.queueService.add('UPDATE', 'product', {
      id,
      name: updated.name,
      description: updated.description,
      unit: updated.unit,
      cost: updated.cost,
      weight: updated.weight,
      category_id: updated.categoryId,
      supplier_id: updated.supplierId,
      is_service: updated.isService,
      is_active: updated.isActive,
      updated_at: now.toISOString()
    })
    return updated
  }

  async delete(id: string): Promise<Product> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('Product not found')

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        // Cascade delete in Cloud
        // 1. Transactions
        await pool.query('DELETE FROM stock_transaction WHERE product_id = $1', [id])
        // 2. Prices
        await pool.query('DELETE FROM store_product_uom_price WHERE product_id = $1', [id])
        await pool.query('DELETE FROM product_uom_category_price WHERE product_id = $1', [id])
        // 3. UOMs
        await pool.query('DELETE FROM product_uom WHERE product_id = $1', [id])
        // 4. Product
        await pool.query('DELETE FROM product WHERE id = $1', [id])

        // Also delete from Local to keep sync
        this.deleteLocal(id)

        return existing
      } catch (error) {
        console.error('[ProductCloud] delete error, queuing:', error)
      }
    }

    // Local Delete
    this.deleteLocal(id)
    await this.queueService.add('DELETE', 'product', { id })
    return existing
  }

  private deleteLocal(id: string): void {
    // 1. Transactions
    this.localDb.run('DELETE FROM stock_transaction WHERE product_id = ?', [id])
    // 2. Prices
    this.localDb.run('DELETE FROM store_product_uom_price WHERE product_id = ?', [id])
    this.localDb.run('DELETE FROM product_uom_category_price WHERE product_id = ?', [id])
    // 3. UOMs
    this.localDb.run('DELETE FROM product_uom WHERE product_id = ?', [id])
    // 4. Product
    this.localDb.run('DELETE FROM product WHERE id = ?', [id])
    saveDb(this.localDb)
  }

  // Restore removed (Hardware Delete)
  async restore(_id: string): Promise<Product> {
    throw new Error('Restore not supported for hard deleted products')
  }

  async toggleActive(id: string): Promise<Product> {
    const product = await this.findById(id)
    if (!product) throw new Error('Product not found')
    const now = new Date()
    const newActive = !product.isActive

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('UPDATE product SET is_active = $1, updated_at = $2 WHERE id = $3', [
          newActive,
          now,
          id
        ])
      } catch (error) {
        console.error('[ProductCloud] toggleActive error:', error)
      }
    }
    this.localDb.run('UPDATE product SET is_active = ?, updated_at = ? WHERE id = ?', [
      newActive ? 1 : 0,
      now.getTime(),
      id
    ])
    saveDb(this.localDb)
    const updated = await this.findById(id)
    if (!updated) throw new Error('Product not found after toggle')
    return updated
  }

  private mapCloudRow(row: Record<string, unknown>): Product {
    return {
      id: row.id as string,
      sku: row.sku as string,
      name: row.name as string,
      description: row.description as string | null,
      unit: row.unit as string,
      cost: row.cost as string,
      weight: (row.weight as string) ?? '0',
      categoryId: row.category_id as string | null,
      supplierId: row.supplier_id as string | null,
      isService: row.is_service === true,
      isActive: row.is_active === true,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      syncedAt: row.synced_at ? new Date(row.synced_at as string) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null,
      deviceId: row.device_id as string | null
    }
  }

  private mapLocalRow(row: Record<string, unknown>): Product {
    return {
      id: row.id as string,
      sku: row.sku as string,
      name: row.name as string,
      description: row.description as string | null,
      unit: row.unit as string,
      cost: row.cost as string,
      weight: (row.weight as string) ?? '0',
      categoryId: row.category_id as string | null,
      supplierId: row.supplier_id as string | null,
      isService: (row.is_service as number) === 1,
      isActive: (row.is_active as number) === 1,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null,
      deviceId: row.device_id as string | null
    }
  }
}
