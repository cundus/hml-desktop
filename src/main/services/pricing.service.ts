import { Database } from 'sql.js'
import { randomUUID } from 'crypto'

export interface ResolvedPrice {
  productId: string
  uomId: string
  priceCategoryId: string
  storeId: string
  price: string
  source: 'store' | 'default'
}

export interface AvailableCategoryPrice {
  priceCategoryId: string
  priceCategoryName: string
  price: string
  source: 'store' | 'default'
}

export interface PriceCategory {
  id: string
  name: string
}

export interface ProductUom {
  id: string
  productId: string
  uomId: string
  uomCode: string
  uomName: string
  conversionFactor: number
  isBaseUnit: boolean
}

export interface ProductUomCategoryPrice {
  id: string
  productId: string
  uomId: string
  priceCategoryId: string
  price: string
}

export interface StoreProductUomPrice {
  id: string
  productId: string
  uomId: string
  priceCategoryId: string
  storeId: string
  price: string
}

export class PricingService {
  constructor(private db: Database) {}

  /**
   * Resolve effective price for (product, uom, category, store)
   * Priority:
   * 1. store_product_uom_price
   * 2. product_uom_category_price
   */
  async resolvePrice(
    productId: string,
    uomId: string,
    priceCategoryId: string,
    storeId: string
  ): Promise<ResolvedPrice> {
    // 1. Store-specific override
    const storeStmt = this.db.prepare(
      `SELECT price FROM store_product_uom_price
       WHERE product_id = ? AND uom_id = ? AND price_category_id = ? AND store_id = ?
       AND deleted_at IS NULL
       ORDER BY updated_at DESC
       LIMIT 1`
    )
    storeStmt.bind([productId, uomId, priceCategoryId, storeId])

    if (storeStmt.step()) {
      const row = storeStmt.getAsObject()
      storeStmt.free()
      return {
        productId,
        uomId,
        priceCategoryId,
        storeId,
        price: row.price as string,
        source: 'store'
      }
    }
    storeStmt.free()

    // 2. Default HQ price
    const defaultStmt = this.db.prepare(
      `SELECT price FROM product_uom_category_price
       WHERE product_id = ? AND uom_id = ? AND price_category_id = ?
       AND deleted_at IS NULL
       ORDER BY updated_at DESC
       LIMIT 1`
    )
    defaultStmt.bind([productId, uomId, priceCategoryId])

    if (defaultStmt.step()) {
      const row = defaultStmt.getAsObject()
      defaultStmt.free()
      return {
        productId,
        uomId,
        priceCategoryId,
        storeId,
        price: row.price as string,
        source: 'default'
      }
    }
    defaultStmt.free()

    throw new Error('Harga untuk kombinasi kategori dan satuan tidak tersedia.')
  }

  /**
   * List all available (category, price) for given product+UOM in a store.
   * If store override exists, it replaces HQ price for that category.
   */
  async getAvailableCategoryPrices(
    productId: string,
    uomId: string,
    storeId: string
  ): Promise<AvailableCategoryPrice[]> {
    const results: AvailableCategoryPrice[] = []

    // 1. Store-specific prices
    const storeStmt = this.db.prepare(
      `SELECT sp.price_category_id AS id, pc.name AS name, sp.price AS price
       FROM store_product_uom_price sp
       JOIN price_category pc ON pc.id = sp.price_category_id
       WHERE sp.product_id = ? AND sp.uom_id = ? AND sp.store_id = ?
       AND sp.deleted_at IS NULL`
    )
    storeStmt.bind([productId, uomId, storeId])

    const overriddenCategoryIds: string[] = []

    while (storeStmt.step()) {
      const row = storeStmt.getAsObject()
      const id = row.id as string
      overriddenCategoryIds.push(id)
      results.push({
        priceCategoryId: id,
        priceCategoryName: row.name as string,
        price: row.price as string,
        source: 'store'
      })
    }
    storeStmt.free()

    // 2. Default HQ prices for categories not overridden by store
    let defaultQuery = `SELECT pucp.price_category_id AS id, pc.name AS name, pucp.price AS price
       FROM product_uom_category_price pucp
       JOIN price_category pc ON pc.id = pucp.price_category_id
       WHERE pucp.product_id = ? AND pucp.uom_id = ? AND pucp.deleted_at IS NULL`
    const params: string[] = [productId, uomId]

    if (overriddenCategoryIds.length > 0) {
      const placeholders = overriddenCategoryIds.map(() => '?').join(',')
      defaultQuery += ` AND pucp.price_category_id NOT IN (${placeholders})`
      params.push(...overriddenCategoryIds)
    }

    const defaultStmt = this.db.prepare(defaultQuery)
    defaultStmt.bind(params)

    while (defaultStmt.step()) {
      const row = defaultStmt.getAsObject()
      const id = row.id as string
      results.push({
        priceCategoryId: id,
        priceCategoryName: row.name as string,
        price: row.price as string,
        source: 'default'
      })
    }
    defaultStmt.free()

    return results
  }

  /**
   * List all price categories.
   */
  async getPriceCategories(): Promise<PriceCategory[]> {
    const stmt = this.db.prepare('SELECT id, name FROM price_category WHERE deleted_at IS NULL')

    const results: PriceCategory[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push({
        id: row.id as string,
        name: row.name as string
      })
    }

    stmt.free()
    return results
  }

  /**
   * List product_uom rows for a product, joined with UOM code/name.
   */
  async getProductUomsByProduct(productId: string): Promise<ProductUom[]> {
    const stmt = this.db.prepare(
      `SELECT pu.id, pu.product_id, pu.uom_id, pu.conversion_factor, pu.is_base_unit,
              u.code AS uom_code, u.name AS uom_name
         FROM product_uom pu
         JOIN uom u ON u.id = pu.uom_id
        WHERE pu.product_id = ? AND pu.deleted_at IS NULL`
    )
    stmt.bind([productId])

    const results: ProductUom[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push({
        id: row.id as string,
        productId: row.product_id as string,
        uomId: row.uom_id as string,
        uomCode: row.uom_code as string,
        uomName: row.uom_name as string,
        conversionFactor: Number(row.conversion_factor ?? 0),
        isBaseUnit: (row.is_base_unit as number) === 1
      })
    }

    stmt.free()
    return results
  }

  /**
   * List HQ (default) prices per category for a given product+UOM.
   */
  async getCategoryPrices(productId: string, uomId: string): Promise<ProductUomCategoryPrice[]> {
    const stmt = this.db.prepare(
      `SELECT id, product_id, uom_id, price_category_id, price
         FROM product_uom_category_price
        WHERE product_id = ? AND uom_id = ? AND deleted_at IS NULL`
    )
    stmt.bind([productId, uomId])

    const results: ProductUomCategoryPrice[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push({
        id: row.id as string,
        productId: row.product_id as string,
        uomId: row.uom_id as string,
        priceCategoryId: row.price_category_id as string,
        price: row.price as string
      })
    }

    stmt.free()
    return results
  }

  /**
   * Upsert HQ price for (product, uom, priceCategory).
   */
  async upsertCategoryPrice(
    productId: string,
    uomId: string,
    priceCategoryId: string,
    price: string
  ): Promise<ProductUomCategoryPrice> {
    const now = Date.now()

    // Check if row exists
    const checkStmt = this.db.prepare(
      `SELECT id FROM product_uom_category_price
        WHERE product_id = ? AND uom_id = ? AND price_category_id = ? AND deleted_at IS NULL
        LIMIT 1`
    )
    checkStmt.bind([productId, uomId, priceCategoryId])

    let existingId: string | null = null
    if (checkStmt.step()) {
      const row = checkStmt.getAsObject()
      existingId = row.id as string
    }
    checkStmt.free()

    if (existingId) {
      this.db.run('UPDATE product_uom_category_price SET price = ?, updated_at = ? WHERE id = ?', [
        price,
        now,
        existingId
      ])

      return {
        id: existingId,
        productId,
        uomId,
        priceCategoryId,
        price
      }
    }

    const id = randomUUID()
    this.db.run(
      'INSERT INTO product_uom_category_price (id, product_id, uom_id, price_category_id, price, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, productId, uomId, priceCategoryId, price, now, now]
    )

    return {
      id,
      productId,
      uomId,
      priceCategoryId,
      price
    }
  }

  async upsertStorePrice(
    productId: string,
    uomId: string,
    priceCategoryId: string,
    storeId: string,
    price: string
  ): Promise<StoreProductUomPrice> {
    const now = Date.now()

    const checkStmt = this.db.prepare(
      `SELECT id FROM store_product_uom_price
        WHERE product_id = ? AND uom_id = ? AND price_category_id = ? AND store_id = ? AND deleted_at IS NULL
        LIMIT 1`
    )
    checkStmt.bind([productId, uomId, priceCategoryId, storeId])

    let existingId: string | null = null
    if (checkStmt.step()) {
      const row = checkStmt.getAsObject()
      existingId = row.id as string
    }
    checkStmt.free()

    if (existingId) {
      this.db.run('UPDATE store_product_uom_price SET price = ?, updated_at = ? WHERE id = ?', [
        price,
        now,
        existingId
      ])

      return {
        id: existingId,
        productId,
        uomId,
        priceCategoryId,
        storeId,
        price
      }
    }

    const id = randomUUID()
    this.db.run(
      'INSERT INTO store_product_uom_price (id, product_id, uom_id, price_category_id, store_id, price, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, productId, uomId, priceCategoryId, storeId, price, now, now]
    )

    return {
      id,
      productId,
      uomId,
      priceCategoryId,
      storeId,
      price
    }
  }

  /**
   * Create a product UOM entry
   */
  async createProductUom(
    productId: string,
    uomId: string,
    conversionFactor: number,
    isBaseUnit: boolean
  ): Promise<ProductUom> {
    const now = Date.now()
    const id = randomUUID()

    // Get UOM code and name
    const uomStmt = this.db.prepare('SELECT code, name FROM uom WHERE id = ? LIMIT 1')
    uomStmt.bind([uomId])
    let uomCode = ''
    let uomName = ''
    if (uomStmt.step()) {
      const row = uomStmt.getAsObject()
      uomCode = row.code as string
      uomName = row.name as string
    }
    uomStmt.free()

    this.db.run(
      'INSERT INTO product_uom (id, product_id, uom_id, conversion_factor, is_base_unit, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, productId, uomId, conversionFactor, isBaseUnit ? 1 : 0, now, now]
    )

    return {
      id,
      productId,
      uomId,
      uomCode,
      uomName,
      conversionFactor,
      isBaseUnit
    }
  }

  /**
   * Delete a product UOM entry (and associated prices)
   */
  async deleteProductUom(id: string): Promise<void> {
    const now = Date.now()

    // Get product_id and uom_id first
    const checkStmt = this.db.prepare('SELECT product_id, uom_id FROM product_uom WHERE id = ?')
    checkStmt.bind([id])
    let productId: string | null = null
    let uomId: string | null = null
    if (checkStmt.step()) {
      const row = checkStmt.getAsObject()
      productId = row.product_id as string
      uomId = row.uom_id as string
    }
    checkStmt.free()

    if (!productId || !uomId) return

    // Soft delete associated prices
    this.db.run(
      'UPDATE product_uom_category_price SET deleted_at = ?, updated_at = ? WHERE product_id = ? AND uom_id = ?',
      [now, now, productId, uomId]
    )
    this.db.run(
      'UPDATE store_product_uom_price SET deleted_at = ?, updated_at = ? WHERE product_id = ? AND uom_id = ?',
      [now, now, productId, uomId]
    )

    // Soft delete the product_uom entry
    this.db.run('UPDATE product_uom SET deleted_at = ?, updated_at = ? WHERE id = ?', [
      now,
      now,
      id
    ])
  }
}
