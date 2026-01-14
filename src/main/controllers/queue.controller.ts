import { ipcMain } from 'electron'
import { QueueService } from '../services/queue.service'
import { QueueProcessorService } from '../services/queue-processor.service'

/**
 * QueueController - IPC handlers for queue operations
 * Provides UI access to queue status and management
 */
export class QueueController {
  constructor(
    private queueService: QueueService,
    private queueProcessor: QueueProcessorService
  ) {}

  registerHandlers(): void {
    // Get queue statistics
    ipcMain.handle('queue:getStats', async () => {
      try {
        const stats = this.queueProcessor.getStats()
        return { success: true, data: stats }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    })

    // Get all queue items (for UI display)
    ipcMain.handle('queue:getAll', async () => {
      try {
        const items = this.queueService.getAll()
        return { success: true, data: items }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    })

    // Get pending queue items
    ipcMain.handle('queue:getPending', async () => {
      try {
        const items = this.queueService.getPending()
        return { success: true, data: items }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    })

    // Retry a failed item
    ipcMain.handle('queue:retryFailed', async (_, id: string) => {
      try {
        this.queueService.retryFailed(id)
        return { success: true, message: 'Item queued for retry' }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    })

    // Clear failed items
    ipcMain.handle('queue:clearFailed', async () => {
      try {
        this.queueService.clearCompleted()
        return { success: true, message: 'Failed items cleared' }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    })

    // Force process queue now
    ipcMain.handle('queue:processNow', async () => {
      try {
        await this.queueProcessor.processQueue()
        return { success: true, message: 'Queue processing triggered' }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    })
  }
}
