/**
 * Global Alert System
 * Can be used outside React components via event-based architecture
 */

export type AlertType = 'success' | 'error' | 'warning' | 'info'

export interface AlertOptions {
  type: AlertType
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
}

export interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: AlertType
}

interface AlertState {
  open: boolean
  options: AlertOptions | null
  resolve?: (value: boolean) => void
}

type AlertListener = (state: AlertState) => void

class GlobalAlertStore {
  private state: AlertState = { open: false, options: null }
  private listeners: Set<AlertListener> = new Set()

  subscribe(listener: AlertListener): () => void {
    this.listeners.add(listener)
    // Immediately call with current state
    listener(this.state)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.state))
  }

  private setState(newState: Partial<AlertState>): void {
    this.state = { ...this.state, ...newState }
    this.notify()
  }

  /**
   * Show an alert modal
   */
  show(options: AlertOptions): void {
    this.setState({
      open: true,
      options: {
        confirmText: 'OK',
        ...options
      }
    })
  }

  /**
   * Show a confirmation modal and return a promise
   */
  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.setState({
        open: true,
        options: {
          type: options.type ?? 'warning',
          title: options.title,
          message: options.message,
          confirmText: options.confirmText ?? 'Ya',
          cancelText: options.cancelText ?? 'Batal'
        },
        resolve
      })
    })
  }

  /**
   * Close the alert modal
   */
  close(confirmed: boolean = false): void {
    const { resolve, options } = this.state

    if (resolve) {
      resolve(confirmed)
    } else if (confirmed && options?.onConfirm) {
      options.onConfirm()
    } else if (!confirmed && options?.onCancel) {
      options.onCancel()
    }

    this.setState({
      open: false,
      options: null,
      resolve: undefined
    })
  }

  getState(): AlertState {
    return this.state
  }
}

// Singleton instance
export const globalAlertStore = new GlobalAlertStore()

// Convenience functions for use anywhere in the app
export const globalAlert = {
  /**
   * Show success alert
   */
  success: (message: string, title?: string): void => {
    globalAlertStore.show({ type: 'success', message, title: title ?? 'Berhasil' })
  },

  /**
   * Show error alert
   */
  error: (message: string, title?: string): void => {
    globalAlertStore.show({ type: 'error', message, title: title ?? 'Error' })
  },

  /**
   * Show warning alert
   */
  warning: (message: string, title?: string): void => {
    globalAlertStore.show({ type: 'warning', message, title: title ?? 'Peringatan' })
  },

  /**
   * Show info alert
   */
  info: (message: string, title?: string): void => {
    globalAlertStore.show({ type: 'info', message, title: title ?? 'Informasi' })
  },

  /**
   * Show custom alert
   */
  show: (options: AlertOptions): void => {
    globalAlertStore.show(options)
  },

  /**
   * Show confirmation dialog and return promise
   */
  confirm: (message: string, title?: string): Promise<boolean> => {
    return globalAlertStore.confirm({ message, title: title ?? 'Konfirmasi' })
  },

  /**
   * Show confirmation dialog with custom options
   */
  confirmWithOptions: (options: ConfirmOptions): Promise<boolean> => {
    return globalAlertStore.confirm(options)
  }
}
