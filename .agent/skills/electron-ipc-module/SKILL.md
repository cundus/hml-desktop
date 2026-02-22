---
name: electron-ipc-module
description: Create a complete Electron IPC module (controller + preload API bridge + bootstrap registration)
---

# Electron IPC Module Skill

This skill guides creating a complete IPC module that bridges the main process and renderer.

## When to Use
When you need to expose backend functionality to the React frontend via Electron's IPC system.

## Architecture

```
Renderer                → Preload (contextBridge)       → Main (ipcMain)
window.api.db.entity.x  → ipcRenderer.invoke('db:...')  → Controller → Service
```

## Step-by-Step

### 1. Create the Controller

File: `src/main/controllers/<entity>.controller.ts`

```typescript
import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { <Entity>CloudService } from '../services/<entity>-cloud.service'
import { requirePermission } from '../utils/auth-guard'
import { Database } from 'sql.js'
import { ApiResponse } from '../types/response'

export class <Entity>Controller {
  constructor(
    private db: Database,
    private service: <Entity>CloudService
  ) {}

  registerHandlers(): void {
    ipcMain.handle(
      'db:<entities>:getAll',
      requirePermission(this.db, '<domain>.<entity>.view', this.getAll.bind(this))
    )
    ipcMain.handle(
      'db:<entities>:getById',
      requirePermission(this.db, '<domain>.<entity>.view', this.getById.bind(this))
    )
    ipcMain.handle(
      'db:<entities>:create',
      requirePermission(this.db, '<domain>.<entity>.create', this.create.bind(this))
    )
    ipcMain.handle(
      'db:<entities>:update',
      requirePermission(this.db, '<domain>.<entity>.create', this.update.bind(this))
    )
    ipcMain.handle(
      'db:<entities>:delete',
      requirePermission(this.db, '<domain>.<entity>.delete', this.delete.bind(this))
    )
  }

  private async getAll(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const items = await this.service.findAll()
      return { success: true, data: items }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getById(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const item = await this.service.findById(id)
      return { success: true, data: item }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async create(_event: IpcMainInvokeEvent, data: any): Promise<ApiResponse> {
    try {
      const item = await this.service.create(data)
      return { success: true, data: item }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async update(_event: IpcMainInvokeEvent, id: string, data: any): Promise<ApiResponse> {
    try {
      const item = await this.service.update(id, data)
      return { success: true, data: item }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async delete(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      await this.service.softDelete(id)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
```

### 2. Create the Preload API

File: `src/preload/api/<entity>.ts`

```typescript
import { ipcRenderer } from 'electron'
import { ApiResponse, BaseEntity } from './types'

export interface <Entity> extends BaseEntity {
  name: string
  // ... fields matching the service type
}

export interface Create<Entity>Dto {
  name: string
  // ... creation fields
}

export const <entity>Api = {
  getAll: () =>
    ipcRenderer.invoke('db:<entities>:getAll') as Promise<ApiResponse<<Entity>[]>>,

  getById: (id: string) =>
    ipcRenderer.invoke('db:<entities>:getById', id) as Promise<ApiResponse<<Entity>>>,

  create: (data: Create<Entity>Dto) =>
    ipcRenderer.invoke('db:<entities>:create', data) as Promise<ApiResponse<<Entity>>>,

  update: (id: string, data: Partial<Create<Entity>Dto>) =>
    ipcRenderer.invoke('db:<entities>:update', id, data) as Promise<ApiResponse<<Entity>>>,

  delete: (id: string) =>
    ipcRenderer.invoke('db:<entities>:delete', id) as Promise<ApiResponse<void>>
}
```

### 3. Register in Preload Index

File: `src/preload/api/index.ts`

```typescript
// Add import
import { <entity>Api } from './<entity>'

// Add to db object
export const db = {
  // ... existing APIs
  <entities>: <entity>Api,
}
```

### 4. Register in Bootstrap

File: `src/main/bootstrap.ts`

```typescript
// Import
import { <Entity>CloudService } from './services/<entity>-cloud.service'
import { <Entity>Controller } from './controllers/<entity>.controller'

// In bootstrap() function, after queueService creation:
const <entity>Service = new <Entity>CloudService(db, queueService)

// After other controller instantiations:
const <entity>Controller = new <Entity>Controller(db, <entity>Service)
<entity>Controller.registerHandlers()
```

## Key Rules

1. **IPC channel format**: `db:<plural-entity>:<action>` (e.g., `db:warranties:getAll`)
2. **Always use `requirePermission()`**: Every handler must be authorized
3. **Always return `ApiResponse`**: `{ success: boolean, data?: T, error?: string }`
4. **Error handling**: Wrap every handler in try/catch, never let errors bubble
5. **Constructor injection**: Services injected via constructor, never imported globally
6. **Bind handlers**: Use `.bind(this)` when passing methods to `ipcMain.handle()`
