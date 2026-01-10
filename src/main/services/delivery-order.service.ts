import { Database } from 'sql.js'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'

export interface DeliveryOrder {
  id: string
  transactionId: string
  noSuratJalan: string
  sequenceNumber: number
  sequenceYear: number
  tanggal: Date
  sales: string | null
  customerId: string | null
  customerName: string
  customerAddress: string | null
  notes: string | null
  printedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateDeliveryOrderDto {
  transactionId: string
  tanggal: Date
  sales?: string
  customerId?: string
  customerName: string
  customerAddress?: string
  notes?: string
}

export interface TransactionForDO {
  id: string
  receiptNumber: string
  createdAt: Date
  customerId?: string
  customerName?: string
  customerAddress?: string
  items: Array<{
    productName: string
    displayQuantity: number
    uomCode: string
    weight: number // in grams
  }>
}

export class DeliveryOrderService {
  constructor(private db: Database) {}

  /**
   * Get all delivery orders
   */
  async getAll(): Promise<DeliveryOrder[]> {
    const stmt = this.db.prepare('SELECT * FROM delivery_order ORDER BY created_at DESC')
    const results: DeliveryOrder[] = []

    while (stmt.step()) {
      results.push(this.mapRowToDeliveryOrder(stmt.getAsObject()))
    }
    stmt.free()

    return results
  }

  /**
   * Find delivery order by ID
   */
  async findById(id: string): Promise<DeliveryOrder | null> {
    const stmt = this.db.prepare('SELECT * FROM delivery_order WHERE id = ?')
    stmt.bind([id])

    if (stmt.step()) {
      const order = this.mapRowToDeliveryOrder(stmt.getAsObject())
      stmt.free()
      return order
    }

    stmt.free()
    return null
  }

  /**
   * Find delivery order by transaction ID
   */
  async findByTransactionId(transactionId: string): Promise<DeliveryOrder | null> {
    const stmt = this.db.prepare('SELECT * FROM delivery_order WHERE transaction_id = ?')
    stmt.bind([transactionId])

    if (stmt.step()) {
      const order = this.mapRowToDeliveryOrder(stmt.getAsObject())
      stmt.free()
      return order
    }

    stmt.free()
    return null
  }

  /**
   * Generate next sequence number for current year
   */
  private getNextSequenceNumber(year: number): number {
    const stmt = this.db.prepare(
      'SELECT MAX(sequence_number) as max_seq FROM delivery_order WHERE sequence_year = ?'
    )
    stmt.bind([year])

    let nextSeq = 1
    if (stmt.step()) {
      const row = stmt.getAsObject()
      if (row.max_seq) {
        nextSeq = (row.max_seq as number) + 1
      }
    }
    stmt.free()

    return nextSeq
  }

  /**
   * Generate "No Surat Jalan" format: SJ-XXX/MM/YYYY
   */
  private generateNoSuratJalan(sequence: number, date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const seqStr = String(sequence).padStart(3, '0')
    return `SJ-${seqStr}/${month}/${year}`
  }

  /**
   * Create a new delivery order
   */
  async create(data: CreateDeliveryOrderDto): Promise<DeliveryOrder> {
    const id = randomUUID()
    const now = Date.now()
    const year = data.tanggal.getFullYear()
    const sequenceNumber = this.getNextSequenceNumber(year)
    const noSuratJalan = this.generateNoSuratJalan(sequenceNumber, data.tanggal)

    this.db.run(
      `INSERT INTO delivery_order (
        id, transaction_id, no_surat_jalan, sequence_number, sequence_year,
        tanggal, sales, customer_id, customer_name, customer_address, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.transactionId,
        noSuratJalan,
        sequenceNumber,
        year,
        data.tanggal.getTime(),
        data.sales || null,
        data.customerId || null,
        data.customerName,
        data.customerAddress || null,
        data.notes || null,
        now,
        now
      ]
    )

    saveDb(this.db)

    return (await this.findById(id))!
  }

  /**
   * Mark delivery order as printed
   */
  async markAsPrinted(id: string): Promise<boolean> {
    const existing = await this.findById(id)
    if (!existing) return false

    this.db.run('UPDATE delivery_order SET printed_at = ?, updated_at = ? WHERE id = ?', [
      Date.now(),
      Date.now(),
      id
    ])

    saveDb(this.db)
    return true
  }

  /**
   * Delete a delivery order
   */
  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id)
    if (!existing) return false

    this.db.run('DELETE FROM delivery_order WHERE id = ?', [id])
    saveDb(this.db)

    return true
  }

  /**
   * Map database row to DeliveryOrder object
   */
  private mapRowToDeliveryOrder(row: Record<string, unknown>): DeliveryOrder {
    return {
      id: row.id as string,
      transactionId: row.transaction_id as string,
      noSuratJalan: row.no_surat_jalan as string,
      sequenceNumber: row.sequence_number as number,
      sequenceYear: row.sequence_year as number,
      tanggal: new Date(row.tanggal as number),
      sales: row.sales as string | null,
      customerId: row.customer_id as string | null,
      customerName: row.customer_name as string,
      customerAddress: row.customer_address as string | null,
      notes: row.notes as string | null,
      printedAt: row.printed_at ? new Date(row.printed_at as number) : null,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number)
    }
  }
}
