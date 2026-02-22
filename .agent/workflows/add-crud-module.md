---
description: Add a new CRUD module (complete backend + frontend feature) end-to-end
---

# Add a New CRUD Module

This workflow creates a complete feature module across all layers of the Electron IPC architecture.

## Prerequisites
- Know the entity name (e.g., `warranty`)
- Know the domain/permission category (e.g., `master`, `operations`, `inventory`)
- Know the DB fields

## Steps

### 1. Create the PostgreSQL Schema
Create `src/main/db/pg-schema/<entity>.ts` using Drizzle ORM:
```typescript
import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core'

export const <entity> = pgTable('<entity>', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  // ... other fields
  is_deleted: boolean('is_deleted').default(false),
  synced_at: timestamp('synced_at'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
})
```
- Export from `src/main/db/pg-schema/index.ts`

### 2. Create the Local SQLite Table
Add the table creation SQL to `src/main/localDb.ts` in the `initializeSchema()` function.

### 3. Create the Local Service
Create `src/main/services/<entity>.service.ts`:
- Define interfaces: `<Entity>`, `Create<Entity>Dto`, `Update<Entity>Dto`
- Class: `<Entity>Service`
- Constructor accepts `Database` (sql.js)
- Implement: `findAll()`, `findById()`, `create()`, `update()`, `delete()`
- Use `mapRowTo<Entity>()` helper
- Call `saveDb()` after writes

### 4. Create the Cloud-First Service
Create `src/main/services/<entity>-cloud.service.ts`:
- Extend `CloudFirstBaseService<Entity, CreateDto, UpdateDto>`
- Set `tableName` and `entityName`
- Implement all abstract methods with cloud-first logic:
  - READ: `this.isOnline()` → cloud query via `this.getPool()`, else local fallback
  - WRITE: cloud if online, else `this.queueOperation()` for offline
- Use `mergeWithLocalPending()` if applicable

### 5. Create the Controller
Create `src/main/controllers/<entity>.controller.ts`:
- Constructor: `(private db: Database, private service: <Entity>CloudService)`
- `registerHandlers()` method registering IPC channels with `requirePermission()`
- Each handler: try/catch returning `ApiResponse`
- Channel naming: `db:<entities>:<action>`

### 6. Add to Bootstrap
Update `src/main/bootstrap.ts`:
- Import the cloud service and controller
- Instantiate the service (after `queueService` is created)
- Instantiate the controller
- Call `controller.registerHandlers()`

### 7. Create the Preload API
Create `src/preload/api/<entity>.ts`:
- Define types/interfaces matching the service
- Export `const <entity>Api = { ... }` with `ipcRenderer.invoke()` calls
- Add to `src/preload/api/index.ts`: import + add to `db` object

### 8. Seed Permissions
Add to `src/main/seed.ts` in `seedPermissions()`:
```typescript
{ id: '<domain>.<entity>.view', name: 'View <Entity>', category: '<domain>', ... },
{ id: '<domain>.<entity>.create', name: 'Create <Entity>', category: '<domain>', ... },
{ id: '<domain>.<entity>.delete', name: 'Delete <Entity>', category: '<domain>', ... },
```

### 9. Create the Frontend Page
Create `src/renderer/src/pages/<domain>/<EntityPage>.tsx`:
- Use MUI components (DataGrid, Dialog, TextField, etc.)
- Use `react-hook-form` + `zod` for form validation
- Access API via `window.api.db.<entities>.<method>()`

### 10. Register Route
Update `src/renderer/src/App.tsx`:
- Import the page component
- Add route with `RoleGuard`:
```tsx
{
  element: <RoleGuard requiredPermissions={['<domain>.<entity>.view']} />,
  children: [{ path: '<route-path>', element: <EntityPage /> }]
}
```

### 11. Add to Navigation
Update `src/renderer/src/components/SideNav.tsx` to include the new menu item.

// turbo
### 12. Typecheck
```bash
npm run typecheck
```
