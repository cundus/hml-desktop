import { Pool } from 'pg'
import { Database } from 'sql.js'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { QueueService, QueueAction } from './queue.service'

/**
 * CloudFirstBaseService - Base class for online-first services
 * 
 * Pattern:
 * - READ: Always try cloud first, fallback to queue replay
 * - WRITE: Cloud if online, queue if offline
 */
export abstract class CloudFirstBaseService<T, CreateDto, UpdateDto> {
  protected queueService: QueueService
  protected localDb: Database
  protected abstract tableName: string
  protected abstract entityName: string

  constructor(localDb: Database, queueService: QueueService) {
    this.localDb = localDb
    this.queueService = queueService
  }

  /**
   * Check if currently online
   */
  protected isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  /**
   * Get cloud database pool
   */
  protected getPool(): Pool {
    return getCloudDb().getPool()
  }

  /**
   * Quote table name for PostgreSQL reserved words
   */
  protected quoteTable(name: string): string {
    const reserved = ['user', 'order', 'group', 'table']
    return reserved.includes(name.toLowerCase()) ? `"${name}"` : name
  }

  /**
   * Queue an operation for later execution
   */
  protected async queueOperation(
    action: QueueAction,
    payload: Record<string, unknown>
  ): Promise<string> {
    return this.queueService.add(action, this.entityName, payload)
  }

  /**
   * Convert timestamp to Date
   */
  protected toDate(value: unknown): Date | null {
    if (!value) return null
    if (value instanceof Date) return value
    if (typeof value === 'number') return new Date(value)
    if (typeof value === 'string') return new Date(value)
    return null
  }

  /**
   * Abstract methods to be implemented by subclasses
   */
  abstract findAll(): Promise<T[]>
  abstract findById(id: string): Promise<T | undefined>
  abstract create(data: CreateDto): Promise<T>
  abstract update(id: string, data: UpdateDto): Promise<T>
  abstract softDelete(id: string): Promise<T>
}

/**
 * Result type for cloud-first operations
 */
export interface CloudFirstResult<T> {
  success: boolean
  data?: T
  queued?: boolean
  error?: string
}
