---
description: Add a new feature including backend service, controller, API bridge, and frontend page
---

# Add a New Feature

General-purpose workflow for adding a new feature that doesn't follow the full CRUD pattern.
For standard CRUD modules, use `/add-crud-module` instead.

## Steps

### 1. Plan the Feature
- Identify which layers need changes (service, controller, preload, renderer)
- Determine if it needs new DB tables or extends existing ones
- Identify required permissions

### 2. Backend Service Logic
Create or modify service in `src/main/services/`:
- For cloud-first: extend `CloudFirstBaseService` or add methods to existing cloud service
- For local-only: use `sql.js` `Database` directly
- Always return typed data, never raw DB rows

### 3. Controller IPC Handlers
Create or modify controller in `src/main/controllers/`:
- Register IPC handlers via `ipcMain.handle()`
- Use `requirePermission()` for authorization
- Return `ApiResponse` format consistently
- Register in `bootstrap.ts`

### 4. Preload Bridge
Create or modify API in `src/preload/api/`:
- Add `ipcRenderer.invoke()` methods matching controller channels
- Export from `src/preload/api/index.ts` and add to `db` object

### 5. Frontend Implementation
Create pages/components in `src/renderer/src/`:
- Use MUI components for UI
- Access data via `window.api.db.<domain>.<method>()`
- Use `react-hook-form` + `zod` for forms
- Use `useAuth()`, `useShift()`, etc. hooks as needed

### 6. Route & Navigation
- Add route in `App.tsx` with `RoleGuard`
- Add menu item in `SideNav.tsx`

// turbo
### 7. Verify
```bash
npm run typecheck
```
