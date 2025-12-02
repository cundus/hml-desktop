# Cloud Sync System - Complete Guide

## Overview

The Cloud Sync system enables bidirectional synchronization between local SQLite database and cloud PostgreSQL database using a **delta sync strategy**.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Renderer (UI)  │  IPC    │   Main Process   │  SQL    │  Cloud (Postgres)│
│                 │ ◄─────► │                  │ ◄─────► │                  │
│  CloudSync.tsx  │         │  SyncService     │         │  PostgreSQL DB   │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │  Local (SQLite)  │
                            └──────────────────┘
```

## Delta Sync Strategy

### Key Concepts

1. **syncedAt** - Timestamp when record was last synced
2. **updatedAt** - Timestamp when record was last modified
3. **deviceId** - Unique identifier for each device
4. **deletedAt** - Soft delete timestamp (null = active)

### Sync Flow

#### 1. Initial Sync (First Launch)

```
Cloud → Local (Pull Only)
- Pull all active records from cloud
- Insert into local database
- Mark as synced
```

#### 2. Full Sync (Manual Button)

```
Step 1: Pull (Cloud → Local)
- Fetch records updated after last sync
- Skip records created by this device
- Conflict resolution: Last write wins (based on updatedAt)

Step 2: Push (Local → Cloud)
- Find unsynced or updated local records
- Upload to cloud
- Mark as synced
```

#### 3. Pull Only

```
Cloud → Local
- Download new/updated records
- Update local database
```

#### 4. Push Only

```
Local → Cloud
- Upload unsynced local changes
- Update cloud database
```

## Conflict Resolution

**Strategy: Last Write Wins**

When both local and cloud have changes to the same record:

- Compare `updatedAt` timestamps
- Keep the most recent version
- Discard the older version
- Increment conflict counter

Example:

```typescript
if (cloudRecord.updatedAt > localRecord.updatedAt) {
  // Cloud wins - update local
  updateLocal(cloudRecord)
} else {
  // Local wins - update cloud
  updateCloud(localRecord)
}
```

## API Reference

### Main Process (SyncService)

#### `initCloudConnection(cloudDatabaseUrl: string)`

Initialize connection to cloud PostgreSQL database.

```typescript
await syncService.initCloudConnection('postgresql://user:pass@host:5432/db')
```

#### `fullSync()`

Perform full bidirectional sync (pull + push).

```typescript
const result = await syncService.fullSync()
// Returns: { success, pulled, pushed, conflicts, errors, timestamp }
```

#### `pullFromCloud()`

Pull data from cloud to local.

```typescript
const result = await syncService.pullFromCloud()
// Returns: { count, conflicts }
```

#### `pushToCloud()`

Push local data to cloud.

```typescript
const result = await syncService.pushToCloud()
// Returns: { count, conflicts }
```

#### `initialSync()`

First-time sync (pull only).

```typescript
const result = await syncService.initialSync()
// Returns: SyncResult
```

#### `getSyncStatus()`

Get current sync status.

```typescript
const status = await syncService.getSyncStatus()
// Returns: { isCloudConnected, lastSyncTime, unsyncedRecordsCount, deviceId }
```

### Renderer (Preload API)

```typescript
// Connect to cloud
await window.api.db.sync.connect(cloudDatabaseUrl)

// Disconnect
await window.api.db.sync.disconnect()

// Full sync
await window.api.db.sync.fullSync()

// Pull only
await window.api.db.sync.pull()

// Push only
await window.api.db.sync.push()

// Initial sync
await window.api.db.sync.initialSync()

// Get status
await window.api.db.sync.getStatus()
```

## Usage Examples

### 1. Connect to Cloud on App Start

```typescript
// In your main window component
useEffect(() => {
  const cloudUrl = localStorage.getItem('cloudDatabaseUrl')
  if (cloudUrl) {
    window.api.db.sync.connect(cloudUrl).then((response) => {
      if (response.success) {
        // Perform initial sync
        window.api.db.sync.initialSync()
      }
    })
  }
}, [])
```

### 2. Manual Sync Button

```tsx
const handleSync = async () => {
  setSyncing(true)
  try {
    const response = await window.api.db.sync.fullSync()
    if (response.success) {
      alert(`Synced: ${response.data.pulled} pulled, ${response.data.pushed} pushed`)
    }
  } finally {
    setSyncing(false)
  }
}

;<button onClick={handleSync} disabled={syncing}>
  {syncing ? 'Syncing...' : 'Sync Now'}
</button>
```

### 3. Auto-Sync Every 5 Minutes

```typescript
useEffect(() => {
  const interval = setInterval(
    async () => {
      const status = await window.api.db.sync.getStatus()
      if (status.data?.isCloudConnected) {
        await window.api.db.sync.fullSync()
      }
    },
    5 * 60 * 1000
  ) // 5 minutes

  return () => clearInterval(interval)
}, [])
```

### 4. Show Sync Status Badge

```tsx
const [unsyncedCount, setUnsyncedCount] = useState(0)

useEffect(() => {
  const loadStatus = async () => {
    const response = await window.api.db.sync.getStatus()
    if (response.data) {
      setUnsyncedCount(response.data.unsyncedRecordsCount)
    }
  }

  loadStatus()
  const interval = setInterval(loadStatus, 30000)
  return () => clearInterval(interval)
}, [])

return (
  <div className="sync-badge">
    {unsyncedCount > 0 && <span className="badge">{unsyncedCount} unsynced</span>}
  </div>
)
```

## Database Schema Requirements

All syncable models must have these fields:

```prisma
model Example {
  id        String    @id @default(uuid())
  // ... other fields ...

  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  syncedAt  DateTime? @map("synced_at")
  deletedAt DateTime? @map("deleted_at")
  deviceId  String?   @map("device_id")
}
```

## Synced Models

The following models are automatically synced:

- **Auth**: User, Role, Permission, UserRole, RolePermission
- **Store**: Store, Customer, CustomerCategory
- **Product**: Product, Category, Supplier, ProductPrice, Batch
- **Inventory**: ProductLocation, StockTransaction, StockAdjustment
- **Purchasing**: PurchaseOrder, PurchaseOrderItem
- **Transfer**: TransferRequest, TransferItem
- **Sales**: Transactions, TransactionItems
- **Audit**: AuditLog

## Performance Considerations

### Optimization Tips

1. **Incremental Sync**
   - Only sync records modified since last sync
   - Use `syncedAt` and `updatedAt` timestamps

2. **Batch Operations**
   - Process records in batches of 100-500
   - Avoid loading entire tables into memory

3. **Selective Sync**
   - Sync critical data first (users, products)
   - Defer large tables (audit logs) to background

4. **Connection Pooling**
   - Reuse database connections
   - Close connections when not in use

5. **Error Handling**
   - Continue sync even if one model fails
   - Log errors for debugging
   - Retry failed operations

### Monitoring

```typescript
// Track sync performance
const startTime = Date.now()
const result = await syncService.fullSync()
const duration = Date.now() - startTime

console.log(`Sync completed in ${duration}ms`)
console.log(`Pulled: ${result.pulled}, Pushed: ${result.pushed}`)
console.log(`Conflicts: ${result.conflicts}`)
```

## Security Best Practices

1. **Encrypt Connection Strings**

   ```typescript
   // Store encrypted in electron-store
   const encryptedUrl = encrypt(cloudDatabaseUrl)
   store.set('cloudUrl', encryptedUrl)
   ```

2. **Use SSL/TLS**

   ```
   postgresql://user:pass@host:5432/db?sslmode=require
   ```

3. **Validate Permissions**
   - Ensure cloud user has appropriate permissions
   - Use read-only connections when possible

4. **Rate Limiting**
   - Implement exponential backoff
   - Limit sync frequency

## Troubleshooting

### Common Issues

#### 1. Connection Timeout

```
Error: Connection timeout
```

**Solution**: Check network connectivity, verify cloud URL

#### 2. Sync Conflicts

```
Warning: 5 conflicts detected
```

**Solution**: Normal behavior - last write wins. Review conflict logs.

#### 3. Unsynced Records Growing

```
Status: 1000+ unsynced records
```

**Solution**:

- Check cloud connectivity
- Perform manual sync
- Review error logs

#### 4. Device ID Mismatch

```
Error: Device ID not found
```

**Solution**: Device ID stored in environment. Regenerate if needed.

## Advanced Features

### Custom Sync Logic

```typescript
// Extend SyncService for custom behavior
class CustomSyncService extends SyncService {
  async syncWithPriority() {
    // Sync critical data first
    await this.pushModelToCloud('user')
    await this.pushModelToCloud('product')

    // Then sync everything else
    await this.fullSync()
  }
}
```

### Sync Hooks

```typescript
// Add hooks for sync events
syncService.on('beforeSync', () => {
  console.log('Sync starting...')
})

syncService.on('afterSync', (result) => {
  console.log('Sync completed:', result)
})
```

### Selective Model Sync

```typescript
// Sync only specific models
const models = ['user', 'product', 'store']
for (const model of models) {
  await syncService.pushModelToCloud(model)
}
```

## Future Enhancements

- [ ] Real-time sync with WebSockets
- [ ] Conflict resolution UI
- [ ] Sync history/audit trail
- [ ] Bandwidth optimization (compression)
- [ ] Offline queue management
- [ ] Multi-device conflict detection
- [ ] Selective field sync
- [ ] Sync scheduling (cron-like)

## Support

For issues or questions:

1. Check error logs in console
2. Review sync status
3. Verify cloud connectivity
4. Check database permissions
