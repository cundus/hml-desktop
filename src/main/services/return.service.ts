import { randomUUID } from 'crypto'
import { Database } from 'sql.js'
import { saveDb } from '../localDb'
import { QueueService } from './queue.service'
import { ProductLocationCloudService } from './product-location-cloud.service'
import { StockTransactionCloudService } from './stock-transaction-cloud.service'
import { getCloudDb } from './cloud-db.service'

export interface ReturnDto {
  transactionId: string
  storeId: string
  returnNumber: string
  totalRefund: string
  reason?: string
  createdBy: string
  items: ReturnItemDto[]
}

export interface ReturnItemDto {
  transactionItemId: string
  productId: string
  quantity: number
  refundPrice: string
  restock: boolean
}

export class ReturnService {
  constructor(
    private db: Database,
    private queueService: QueueService,
    private stockTransactionService: StockTransactionCloudService,
    private productLocationService: ProductLocationCloudService
  ) {}

  async createReturn(data: ReturnDto): Promise<any> {
    const id = randomUUID()
    const now = Date.now()
    const nowIso = new Date(now).toISOString()

    const returnNumber = data.returnNumber || `RET-${now}`

    // 1. Queue Return Header INSERT (cloud)
    await this.queueService.add('INSERT', 'transaction_return', {
      id,
      transaction_id: data.transactionId,
      return_number: returnNumber,
      store_id: data.storeId,
      total_refund: data.totalRefund,
      reason: data.reason ?? null,
      created_by: data.createdBy,
      created_at: nowIso,
      updated_at: nowIso
    })

    // 1b. Also insert return header to LOCAL DB to keep in sync
    this.db.run(
      `INSERT OR REPLACE INTO transaction_return (id, transaction_id, return_number, store_id, total_refund, reason, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.transactionId, returnNumber, data.storeId, data.totalRefund, data.reason ?? null, data.createdBy, now, now]
    )

    // Fetch transaction items for reference
    const pool = getCloudDb().getPool()
    const txnItemsRes = await pool.query(
      'SELECT id, product_name, uom_code, display_quantity, quantity FROM transaction_items WHERE transaction_id = $1',
      [data.transactionId]
    )
    const txnItemMap = new Map<string, any>(txnItemsRes.rows.map((r) => [r.id, r]))

    // 2. Process Items
    for (const item of data.items) {
      const itemId = randomUUID()

      // Lookup original item details
      const txnItem = txnItemMap.get(item.transactionItemId)
      let productName = ''
      let uomCode = 'PCS'
      let conversionFactor = 1
      let displayQuantity = item.quantity

      if (txnItem) {
        productName = txnItem.product_name || ''
        uomCode = txnItem.uomCode || txnItem.uom_code || 'PCS'
        const baseQty = Number(txnItem.quantity)
        const dispQty = Number(txnItem.displayQuantity || txnItem.display_quantity) || baseQty
        conversionFactor = baseQty > 0 && dispQty > 0 ? baseQty / dispQty : 1
        displayQuantity = conversionFactor > 0 ? item.quantity / conversionFactor : item.quantity
      }

      // 2a. Queue Item INSERT (cloud)
      await this.queueService.add('INSERT', 'transaction_return_item', {
        id: itemId,
        return_id: id,
        transaction_item_id: item.transactionItemId,
        product_id: item.productId,
        quantity: item.quantity,
        refund_price: item.refundPrice,
        restock: item.restock ? 1 : 0,
        product_name: productName,
        uom_code: uomCode,
        display_quantity: displayQuantity,
        conversion_factor: conversionFactor,
        created_at: nowIso,
        updated_at: nowIso
      })

      // 2a-local. Also insert return item to LOCAL DB
      this.db.run(
        `INSERT OR REPLACE INTO transaction_return_item (id, return_id, transaction_item_id, product_id, quantity, refund_price, restock, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [itemId, id, item.transactionItemId, item.productId, item.quantity, item.refundPrice, item.restock ? 1 : 0, now, now]
      )

      // 2b. Stock Adjustment (if restock is true)
      if (item.restock) {
        await this.stockTransactionService.create({
          productId: item.productId,
          storeId: data.storeId,
          type: 'RETURN',
          quantity: item.quantity,
          reference: returnNumber,
          performedBy: data.createdBy
        })

        await this.productLocationService.adjustQuantity(
          item.productId,
          data.storeId,
          item.quantity
        )
      }
    }

    // 3. Queue transaction item quantity updates + update local DB
    try {
      for (const item of data.items) {
        const txnItem = txnItemMap.get(item.transactionItemId)
        if (txnItem) {
          const currentQty = Number(txnItem.quantity)
          const currentDisplayQty = Number(txnItem.displayQuantity || txnItem.display_quantity) || currentQty
          const newQty = currentQty - item.quantity
          const conversionFactor =
            currentQty > 0 && currentDisplayQty > 0 ? currentQty / currentDisplayQty : 1
          const newDisplayQty = newQty / conversionFactor

          // Queue for cloud
          await this.queueService.add('UPDATE', 'transaction_items', {
            id: item.transactionItemId,
            quantity: newQty,
            display_quantity: newDisplayQty,
            updated_at: nowIso
          })

          // Also update LOCAL DB to prevent sync overwrite
          this.db.run(
            `UPDATE transaction_items SET quantity = ?, updated_at = ? WHERE id = ?`,
            [newQty, now, item.transactionItemId]
          )
        }
      }

      // 4. Queue transaction totals update
      const itemsResult = await pool.query(
        'SELECT id, quantity, display_quantity, price FROM transaction_items WHERE transaction_id = $1',
        [data.transactionId]
      )

      let newSubtotal = 0
      for (const row of itemsResult.rows) {
        const baseQty = Number(row.quantity)
        const displayQty = Number(row.display_quantity) || baseQty
        const conversionFactor = baseQty > 0 && displayQty > 0 ? baseQty / displayQty : 1

        const returnedItem = data.items.find((i) => i.transactionItemId === row.id)
        const newBaseQty = returnedItem ? baseQty - returnedItem.quantity : baseQty
        // Convert back to display units since price is per display unit (e.g. per SAK, not per PCS)
        const newDisplayQty = conversionFactor > 0 ? newBaseQty / conversionFactor : newBaseQty
        newSubtotal += newDisplayQty * Number(row.price)
      }

      const txnResult = await pool.query('SELECT discount FROM transactions WHERE id = $1', [
        data.transactionId
      ])
      const discount = Number(txnResult.rows[0]?.discount) || 0
      const newTotal = newSubtotal - discount

      // Queue for cloud
      await this.queueService.add('UPDATE', 'transactions', {
        id: data.transactionId,
        subtotal: newSubtotal.toString(),
        total: newTotal.toString(),
        updated_at: nowIso
      })

      // Also update LOCAL DB to prevent sync overwrite
      this.db.run(
        `UPDATE transactions SET subtotal = ?, total = ?, updated_at = ? WHERE id = ?`,
        [newSubtotal.toString(), newTotal.toString(), now, data.transactionId]
      )

      // Save all local DB changes
      saveDb(this.db)
    } catch (error) {
      console.error('[ReturnService] Failed to queue transaction updates:', error)
    }

    return { id, returnNumber }
  }

  async getReturnSummaryByDateRange(
    startDate: string,
    endDate: string,
    storeId?: string
  ): Promise<{ totalRefund: number; count: number }> {
    try {
      const pool = getCloudDb().getPool()

      let query = `SELECT COALESCE(SUM(total_refund), 0) as total_refund, COUNT(*) as count FROM transaction_return WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2`
      const params: any[] = [startDate, endDate]

      if (storeId) {
        query += ` AND store_id = $3`
        params.push(storeId)
      }

      const result = await pool.query(query, params)
      return {
        totalRefund: parseFloat(result.rows[0].total_refund || '0'),
        count: parseInt(result.rows[0].count || '0')
      }
    } catch (error) {
      console.error('[ReturnService] getReturnSummaryByDateRange error:', error)
      return { totalRefund: 0, count: 0 }
    }
  }

  async getReturnsByTransactionId(transactionId: string): Promise<any[]> {
    try {
      const pool = getCloudDb().getPool()
      const result = await pool.query(
        'SELECT * FROM transaction_return WHERE transaction_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
        [transactionId]
      )

      const returns: any[] = []
      for (const row of result.rows) {
        const items = await this.getReturnItems(row.id)
        returns.push({ ...row, items })
      }
      return returns
    } catch (error) {
      console.error('[ReturnService] getReturnsByTransactionId error:', error)
      return []
    }
  }

  async getReturnItems(returnId: string): Promise<any[]> {
    try {
      const pool = getCloudDb().getPool()
      const result = await pool.query(
        'SELECT * FROM transaction_return_item WHERE return_id = $1',
        [returnId]
      )
      return result.rows
    } catch (error) {
      console.error('[ReturnService] getReturnItems error:', error)
      return []
    }
  }
}
