import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { AuthCloudService } from '../services/auth-cloud.service'
import { ApiResponse } from '../types/response'

export class AuthController {
  constructor(private authService: AuthCloudService) {}

  registerHandlers(): void {
    ipcMain.handle('auth:login', this.login.bind(this))
    ipcMain.handle('auth:verifyPin', this.verifyPin.bind(this))
  }

  private async login(
    _event: IpcMainInvokeEvent,
    email: string,
    password: string
  ): Promise<ApiResponse> {
    try {
      const result = await this.authService.login(email, password)
      return {
        success: true,
        data: result
      }
    } catch (error) {
      console.error('Error during login:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      }
    }
  }

  private async verifyPin(
    _event: IpcMainInvokeEvent,
    userId: string,
    pin: string
  ): Promise<ApiResponse<boolean>> {
    try {
      const result = await this.authService.verifyPin(userId, pin)
      return {
        success: true,
        data: result
      }
    } catch (error) {
      console.error('Error verifying PIN:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PIN verification failed'
      }
    }
  }
}
