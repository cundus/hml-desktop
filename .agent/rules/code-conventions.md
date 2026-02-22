---
trigger: always_on
---

# Code Conventions

## Naming
- Files: `kebab-case` (e.g., `expense-cloud.service.ts`, `purchase-order.controller.ts`)
- Classes: `PascalCase` (e.g., `ExpenseCloudService`, `PurchaseOrderController`)
- Functions/methods: `camelCase` (e.g., `findById`, `registerHandlers`)
- IPC channels: `db:<domain>:<action>` (e.g., `db:expenses:getAll`, `db:transactions:create`)
- Preload API objects: `camelCase` ending with `Api` (e.g., `expenseApi`, `transactionApi`)

## File Organization
- **Main process** (`src/main/`):
  - `controllers/` — IPC handler classes, one per domain
  - `services/` — Business logic, always in pairs: `<name>.service.ts` (local) + `<name>-cloud.service.ts` (cloud-first)
  - `db/pg-schema/` — Drizzle ORM PostgreSQL schema definitions
- **Preload** (`src/preload/`):
  - `api/` — IPC bridge modules, grouped by feature
  - `api/index.ts` — Central export, all APIs aggregated into `db` object
- **Renderer** (`src/renderer/src/`):
  - `pages/` — Feature-organized page components
  - `components/` — Reusable shared UI components
  - `contexts/` — React context providers
  - `hooks/` — Custom React hooks
  - `layouts/` — Layout wrapper components
  - `lib/` — Utility libraries
  - `utils/` — Helper functions

## Controller Pattern
- Every controller class must:
  1. Accept dependencies via constructor injection
  2. Expose `registerHandlers(): void` to register all IPC handlers
  3. Wrap each handler with `requirePermission()` for authorization
  4. Return `ApiResponse` format: `{ success: boolean, data?: T, error?: string }`
  5. Catch all errors and return structured error responses

## Service Pattern
- Cloud-first services extend `CloudFirstBaseService<T, CreateDto, UpdateDto>`
- Must implement: `findAll()`, `findById()`, `create()`, `update()`, `softDelete()`
- Use `this.isOnline()` to check connectivity, `this.getPool()` for PG connection
- Offline writes go through `this.queueOperation()` for later sync
- Local-only services use raw `sql.js` Database queries

## Preload API Pattern
- Each API module exports a `const <name>Api = { ... }` object
- Methods use `ipcRenderer.invoke()` with typed `Promise<ApiResponse<T>>` return
- Types/interfaces defined in the same file or imported from `./types`

## React/Frontend Conventions
- Use MUI (Material UI v7) for all UI components
- Form handling: `react-hook-form` + `zod` for validation
- Routing: `react-router-dom` v7 with `createHashRouter`
- State management: React Context (no Redux)
- Permission guards: `<RoleGuard requiredPermissions={[...]} />`
- Auth: `<RequireAuth />` wrapper for protected routes
