export class SyncLockService {
  private locks = new Map<string, boolean>()

  /**
   * Try to acquire a lock. Returns true if acquired, false if already locked.
   */
  acquire(key: string): boolean {
    if (this.locks.get(key)) {
      return false
    }
    this.locks.set(key, true)
    return true
  }

  /**
   * Release a lock.
   */
  release(key: string): void {
    this.locks.delete(key)
  }

  /**
   * Check if a key is locked.
   */
  isLocked(key: string): boolean {
    return !!this.locks.get(key)
  }
}

// Singleton instance
const syncLockService = new SyncLockService()

export function getSyncLockService(): SyncLockService {
  return syncLockService
}
