# Database Usage Example: Renderer → Main → Prisma

This document demonstrates the complete flow of using Prisma database operations from the React renderer process in Electron.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process (React)                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Component calls: window.api.db.users.getAll()        │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ IPC (contextBridge)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Preload Script                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ipcRenderer.invoke('db:users:getAll')                │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ IPC Channel
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Main Process                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ipcMain.handle('db:users:getAll', async () => {      │ │
│  │    const prisma = getPrisma()                         │ │
│  │    return await prisma.user.findMany(...)             │ │
│  │  })                                                    │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ Prisma Client
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (SQLite/PostgreSQL)              │
└─────────────────────────────────────────────────────────────┘
```

## Complete Example

### 1. Main Process (`src/main/index.ts`)

Register IPC handlers that use Prisma:

```typescript
import { getPrisma } from './db'

// In app.whenReady():
ipcMain.handle('db:users:getAll', async () => {
  const prisma = getPrisma()
  return await prisma.user.findMany({
    where: { deletedAt: null },
    include: { roles: true }
  })
})

ipcMain.handle('db:users:create', async (_event, data) => {
  const prisma = getPrisma()
  return await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: data.password
    }
  })
})

ipcMain.handle('db:users:softDelete', async (_event, id: string) => {
  const prisma = getPrisma()
  return await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() }
  })
})
```

### 2. Preload Script (`src/preload/index.ts`)

Expose database API to renderer:

```typescript
const api = {
  db: {
    users: {
      getAll: async () => {
        return await ipcRenderer.invoke('db:users:getAll')
      },
      create: async (data: { name: string; email: string; password: string }) => {
        return await ipcRenderer.invoke('db:users:create', data)
      },
      softDelete: async (id: string) => {
        return await ipcRenderer.invoke('db:users:softDelete', id)
      }
    }
  }
}

contextBridge.exposeInMainWorld('api', api)
```

### 3. Type Definitions (`src/preload/index.d.ts`)

Define TypeScript types for the API:

```typescript
interface DatabaseAPI {
  users: {
    getAll: () => Promise<User[]>
    create: (data: { name: string; email: string; password: string }) => Promise<User>
    softDelete: (id: string) => Promise<User>
  }
}

interface API {
  db: DatabaseAPI
}

declare global {
  interface Window {
    api: API
  }
}
```

### 4. React Component (`src/renderer/src/pages/examples/DatabaseExample.tsx`)

Use the database API in your React components:

```typescript
import { useEffect, useState } from 'react'

export default function DatabaseExample() {
  const [users, setUsers] = useState([])

  // Load users from database
  const loadUsers = async () => {
    try {
      const result = await window.api.db.users.getAll()
      setUsers(result)
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }

  // Create a new user
  const handleCreateUser = async (name: string, email: string, password: string) => {
    try {
      await window.api.db.users.create({ name, email, password })
      await loadUsers() // Refresh the list
    } catch (error) {
      console.error('Failed to create user:', error)
    }
  }

  // Soft delete a user
  const handleDeleteUser = async (id: string) => {
    try {
      await window.api.db.users.softDelete(id)
      await loadUsers() // Refresh the list
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }

  // Load data on mount
  useEffect(() => {
    loadUsers()
  }, [])

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            {user.name} ({user.email})
            <button onClick={() => handleDeleteUser(user.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

## Soft Delete Pattern

All models have a `deletedAt` field for soft deletes:

```typescript
// Soft delete (mark as deleted)
await window.api.db.users.softDelete(userId)

// Query only active (non-deleted) records
const activeUsers = await prisma.user.findMany({
  where: { deletedAt: null }
})

// Restore a soft-deleted record
await prisma.user.update({
  where: { id: userId },
  data: { deletedAt: null }
})
```

## Available Database APIs

### Users

- `window.api.db.users.getAll()` - Get all active users
- `window.api.db.users.getById(id)` - Get user by ID
- `window.api.db.users.create(data)` - Create new user
- `window.api.db.users.update(id, data)` - Update user
- `window.api.db.users.softDelete(id)` - Soft delete user

### Products

- `window.api.db.products.getAll()` - Get all active products
- `window.api.db.products.getById(id)` - Get product by ID
- `window.api.db.products.create(data)` - Create new product
- `window.api.db.products.update(id, data)` - Update product
- `window.api.db.products.softDelete(id)` - Soft delete product

## Adding New Database Operations

To add a new database operation:

1. **Add IPC handler in main process** (`src/main/index.ts`):

```typescript
ipcMain.handle('db:customers:getAll', async () => {
  const prisma = getPrisma()
  return await prisma.customer.findMany({
    where: { deletedAt: null }
  })
})
```

2. **Add method to preload script** (`src/preload/index.ts`):

```typescript
db: {
  customers: {
    getAll: async () => {
      return await ipcRenderer.invoke('db:customers:getAll')
    }
  }
}
```

3. **Add TypeScript types** (`src/preload/index.d.ts`):

```typescript
interface DatabaseAPI {
  customers: {
    getAll: () => Promise<Customer[]>
  }
}
```

4. **Use in React component**:

```typescript
const customers = await window.api.db.customers.getAll()
```

## Security Notes

- Never expose Prisma Client directly to the renderer process
- Always validate and sanitize input in IPC handlers
- Use parameterized queries (Prisma does this automatically)
- Implement proper authentication/authorization checks in handlers
- Consider rate limiting for sensitive operations

## Error Handling

Always wrap database calls in try-catch:

```typescript
try {
  const users = await window.api.db.users.getAll()
  setUsers(users)
} catch (error) {
  console.error('Database error:', error)
  // Show user-friendly error message
}
```

## Next Steps

1. Run `npm install @prisma/client` if not already installed
2. Run `npx prisma generate` to generate Prisma Client
3. Run `npx prisma db push` to sync schema with database
4. Test the example component at `/examples/database`
