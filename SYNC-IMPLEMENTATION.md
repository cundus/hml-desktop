# Sync Service Implementation

## Overview

The `SyncService` handles bidirectional synchronization between:
- **Local**: sql.js (pure JavaScript SQLite in-memory/file-based)
- **Cloud**: PostgreSQL via Drizzle ORM + node-postgres

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Electron App                            │
│                                                              │
│  ┌──────────────────┐              ┌──────────────────┐    │
│  │   sql.js (Local) │◄────sync────►│  SyncService     │    │
│  │   SQLite WASM    │              │                  │    │
│  │                  │              │  - Pull          │    │
│  │  - Categories    │              │  - Push          │    │
│  │  - Suppliers     │              │  - Conflict Res  │    │
│  │  - Stores        │              └────────┬─────────┘    │
│  │  - Customers     │                       │              │
│  │  - Users         │                       │              │
│  │  - Products      │                       │              │
│  └──────────────────┘                       │              │
│                                              │              │
└──────────────────────────────────────────────┼──────────────┘
                                               │
                                               │ Drizzle + pg
                                               ▼
                                    ┌──────────────────────┐
                                    │   Cloud PostgreSQL   │
                                    │                      │
                                    │  - Master Data       │
                                    │  - Users             │
                                    │  - Products          │
                                    │  - Transactions      │
                                    └──────────────────────┘
```

## Sync Strategy

### Delta Sync
- Only sync records that have changed since last sync
- Use `updated_at` and `synced_at` timestamps to track state
- Use `device_id` to identify record origin

### Conflict Resolution
- **Last Write Wins** (based on `updated_at` timestamp)
- Cloud record with newer `updated_at` overwrites local
- Local record with newer `updated_at` overwrites cloud

### Sync Flow

```
1. PULL (Cloud → Local)
   ├─ Fetch cloud records updated since last pull
   ├─ For each cloud record:
   │  ├─ If not exists locally → INSERT
   │  ├─ If exists and cloud newer → UPDATE
   │  └─ If exists and local newer → CONFLICT (resolved on push)
   └─ Update last_pull_at timestamp

2. PUSH (Local → Cloud)
   ├─ Fetch local records updated since last push
   ├─ For each local record:
   │  ├─ If not exists in cloud → INSERT
   │  ├─ If exists and local newer → UPDATE
   │  └─ If exists and cloud newer → SKIP (already pulled)
   ├─ Mark synced records with synced_at timestamp
   └─ Update last_push_at timestamp

3. FULL SYNC
   ├─ Run PULL first (cloud is source of truth)
   └─ Then run PUSH (upload local changes)
```

## Database Schema

### Local (sql.js)

All entity tables have these sync-related columns:
```sql
created_at   INTEGER NOT NULL  -- Unix timestamp
updated_at   INTEGER NOT NULL  -- Unix timestamp
synced_at    INTEGER           -- Unix timestamp (NULL if never synced)
deleted_at   INTEGER           -- Unix timestamp (soft delete)
device_id    TEXT              -- Device identifier
```

### Sync Metadata Table
```sql
CREATE TABLE sync_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_name TEXT NOT NULL UNIQUE,  -- e.g. 'category', 'product'
  last_sync_at INTEGER,              -- Last successful sync
  last_pull_at INTEGER,              -- Last pull from cloud
  last_push_at INTEGER,              -- Last push to cloud
  device_id TEXT                     -- Device identifier
)
```

### Cloud (PostgreSQL)

Same schema as local, but uses PostgreSQL types:
```sql
created_at   TIMESTAMP NOT NULL
updated_at   TIMESTAMP NOT NULL
synced_at    TIMESTAMP
deleted_at   TIMESTAMP
device_id    TEXT
```

## Synced Entities

The following entities are synchronized:
1. `category` - Product categories
2. `supplier` - Suppliers
3. `store` - Stores/branches
4. `customer_category` - Customer categories
5. `user` - Users
6. `product` - Products

## API

### Initialize Cloud Connection
```typescript
await syncService.initCloudConnection(cloudDatabaseUrl)
// or use process.env.DATABASE_URL
await syncService.initCloudConnection()
```

### Full Sync
```typescript
const result = await syncService.fullSync()
// Returns: { success, pulled, pushed, conflicts, errors, timestamp }
```

### Pull Only
```typescript
const result = await syncService.pullFromCloud()
// Returns: { count, conflicts }
```

### Push Only
```typescript
const result = await syncService.pushToCloud()
// Returns: { count, conflicts }
```

### Get Sync Status
```typescript
const status = await syncService.getSyncStatus()
// Returns: { isCloudConnected, lastSyncTime, unsyncedRecordsCount, deviceId }
```

### Disconnect
```typescript
await syncService.disconnect()
```

## Usage Example

```typescript
import { SyncService } from './services'
import { getDb } from './db'

// Initialize
const localDb = await getDb()
const syncService = new SyncService(localDb)

// Connect to cloud
await syncService.initCloudConnection(process.env.DATABASE_URL)

// Perform initial sync
const result = await syncService.initialSync()
console.log(`Synced: ${result.pulled} pulled, ${result.pushed} pushed`)

// Later, do incremental sync
await syncService.fullSync()

// Check status
const status = await syncService.getSyncStatus()
console.log(`Unsynced records: ${status.unsyncedRecordsCount}`)

// Disconnect when done
await syncService.disconnect()
```

## IPC Integration

The `SyncController` exposes these IPC channels:

```typescript
// Renderer process
const result = await window.api.db.sync.fullSync()
const status = await window.api.db.sync.getStatus()
await window.api.db.sync.initCloud(databaseUrl)
```

## Data Type Conversions

### Local (sql.js) → Cloud (PostgreSQL)

| Local Type | Cloud Type | Conversion |
|------------|------------|------------|
| `INTEGER` (timestamp) | `TIMESTAMP` | `new Date(timestamp)` |
| `INTEGER` (boolean) | `BOOLEAN` | `value === 1` |
| `TEXT` | `TEXT` | No conversion |
| `NULL` | `NULL` | No conversion |

### Cloud (PostgreSQL) → Local (sql.js)

| Cloud Type | Local Type | Conversion |
|------------|------------|------------|
| `TIMESTAMP` | `INTEGER` | `date.getTime()` |
| `BOOLEAN` | `INTEGER` | `value ? 1 : 0` |
| `TEXT` | `TEXT` | No conversion |
| `NULL` | `NULL` | No conversion |

## Error Handling

All sync methods throw errors on failure:

```typescript
try {
  await syncService.fullSync()
} catch (error) {
  if (error.message.includes('Cloud not connected')) {
    // Handle connection error
  } else {
    // Handle other errors
  }
}
```

The `SyncResult` object also contains an `errors` array:

```typescript
const result = await syncService.fullSync()
if (!result.success) {
  console.error('Sync errors:', result.errors)
}
```

## Conflict Examples

### Scenario 1: Cloud Newer
```
Local:  { id: '123', name: 'Old Name', updated_at: 1000 }
Cloud:  { id: '123', name: 'New Name', updated_at: 2000 }
Result: Local updated to 'New Name' (cloud wins)
```

### Scenario 2: Local Newer
```
Local:  { id: '123', name: 'New Name', updated_at: 2000 }
Cloud:  { id: '123', name: 'Old Name', updated_at: 1000 }
Result: Cloud updated to 'New Name' (local wins)
```

### Scenario 3: New Record
```
Local:  { id: '456', name: 'Local Only', updated_at: 1000 }
Cloud:  (not exists)
Result: Inserted to cloud
```

## Performance Considerations

### Batch Size
- Currently processes all records per entity
- For large datasets (>10k records), consider pagination

### Network
- Each entity syncs sequentially
- Consider parallel sync for better performance

### Database Locks
- sql.js is single-threaded
- Sync operations block other database access
- Consider running sync in background with progress updates

## Testing

### Manual Testing
```bash
# Start app
npm run dev

# In app, trigger sync via UI or DevTools console
window.api.db.sync.fullSync()
```

### Unit Testing
```typescript
describe('SyncService', () => {
  it('should pull records from cloud', async () => {
    const result = await syncService.pullFromCloud()
    expect(result.count).toBeGreaterThan(0)
  })
  
  it('should push records to cloud', async () => {
    const result = await syncService.pushToCloud()
    expect(result.count).toBeGreaterThan(0)
  })
})
```

## Troubleshooting

### "Cloud not connected"
- Ensure `initCloudConnection()` was called
- Check `DATABASE_URL` environment variable
- Verify network connectivity

### "Device ID not found"
- Device ID is auto-generated on first run
- Stored in `sync_metadata` table with `entity_name = 'device'`

### Sync takes too long
- Check network latency
- Consider reducing sync frequency
- Implement incremental sync with smaller time windows

### Conflicts not resolving
- Verify `updated_at` timestamps are set correctly
- Check conflict resolution logic in code
- Review sync logs for details

## Future Enhancements

1. **Selective Sync**: Allow users to choose which entities to sync
2. **Conflict UI**: Show conflicts to user for manual resolution
3. **Offline Queue**: Queue changes when offline, sync when online
4. **Real-time Sync**: Use WebSockets for instant updates
5. **Compression**: Compress data before network transfer
6. **Encryption**: Encrypt sensitive data in transit
7. **Versioning**: Track record versions for better conflict detection
8. **Audit Trail**: Log all sync operations for debugging

## Security

### Authentication
- Cloud database requires valid credentials
- Use environment variables for sensitive data
- Never hardcode database URLs

### Authorization
- Implement row-level security in PostgreSQL
- Filter synced data based on user permissions
- Validate device_id to prevent unauthorized access

### Data Privacy
- Consider encrypting sensitive fields
- Implement data retention policies
- Comply with GDPR/privacy regulations

## Monitoring

### Metrics to Track
- Sync success rate
- Average sync duration
- Number of conflicts
- Unsynced record count
- Network errors

### Logging
```typescript
console.log('✓ Full sync complete: pulled 50, pushed 30')
console.log('✗ Sync failed:', error.message)
```

## Conclusion

The SyncService provides a robust, conflict-aware synchronization system between local sql.js and cloud PostgreSQL. It handles delta syncs efficiently, resolves conflicts automatically, and provides clear status reporting.

**Status**: ✅ Fully Implemented - Ready for Testing
