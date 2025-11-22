/* eslint-disable @typescript-eslint/no-unused-vars */
import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { AuthService } from '../services/auth.service'
import { ApiResponse } from '../types/response'

export class AuthController {
  constructor(private authService: AuthService) {}

  registerHandlers(): void {
    ipcMain.handle('auth:login', this.login.bind(this))
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
}
