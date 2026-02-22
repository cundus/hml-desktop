---
trigger: always_on
---

# Architecture Overview

## Tech Stack
- **Runtime**: Electron (desktop) with electron-vite + React 19
- **Language**: TypeScript (strict)
- **Frontend**: React + MUI v7 + react-router-dom v7 + react-hook-form + zod
- **Local DB**: SQLite via `sql.js` (in-browser WASM), stored as `dev.db`
- **Cloud DB**: PostgreSQL via `pg` driver, schema managed by Drizzle ORM
- **Build**: electron-vite (Vite-based), electron-builder for packaging
- **Auto-update**: electron-updater

## Data Flow (IPC Architecture)
```
Renderer (React) → Preload (contextBridge/ipcRenderer) → Main (ipcMain) → Controller → Service → DB
```

1. **Renderer** calls `window.api.db.<domain>.<method>(...args)`
2. **Preload** bridges via `ipcRenderer.invoke('db:<domain>:<method>', ...args)`
3. **Main** process handles via `ipcMain.handle(channel, handler)`
4. **Controller** authorizes via `requirePermission()`, delegates to service
5. **Service** queries cloud (PG) first, falls back to local (SQLite)
6. Returns `ApiResponse { success, data?, error? }` back through the chain

## Bootstrap Flow (`src/main/bootstrap.ts`)
1. Initialize SQLite database via `getDb()`
2. Run seed functions (permissions, roles, admin, UOMs, price categories)
3. Create `QueueService` + `QueueProcessorService`
4. Instantiate all cloud-first services (injecting db + queueService)
5. Auto-connect to PostgreSQL if `PG_DATABASE_URL` is set or stored in app config
6. Start connectivity monitoring + periodic sync (5-min interval)
7. Instantiate all controllers and call `registerHandlers()`
8. Restore auth session

## Cloud Sync Strategy
- **Queue-based offline sync**: offline writes are queued via `QueueService`
- **Periodic full sync**: every 5 minutes via `periodic-sync.service.ts`
- **Optimistic concurrency control**: prevents race conditions during push
- **Local pending merge**: `mergeWithLocalPending` overlays offline changes on cloud results

## Permission System
- Permissions: `<domain>.<entity>.<action>` (e.g., `sales.pos.view`)
- Enforced at controller level via `requirePermission()` utility
- Enforced at route level via `<RoleGuard requiredPermissions={[...]} />`
