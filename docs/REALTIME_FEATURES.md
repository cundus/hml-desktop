# Realtime Backend Server Features

Based on the current PetShop Management System implementation, the following features would benefit from a realtime backend server connection.

## Current Architecture

- **Local Database**: sql.js (SQLite in-memory/file)
- **Cloud Database**: PostgreSQL via Supabase
- **Sync Strategy**: Delta sync with conflict resolution (pull/push)

---

## Features Requiring Realtime Backend

### 1. **Multi-Device Inventory Sync**

| Priority                                                                                                          | High |
| ----------------------------------------------------------------------------------------------------------------- | ---- |
| **Current**: Inventory changes sync on manual trigger or app startup                                              |
| **Realtime Need**: When stock is updated at one store/device, all other devices should see the change immediately |
| **Use Case**: Prevent overselling when multiple cashiers process orders simultaneously                            |

### 2. **Live Stock Alerts**

| Priority                                                                    | High |
| --------------------------------------------------------------------------- | ---- |
| **Current**: No real-time stock monitoring                                  |
| **Realtime Need**: Push notifications when stock falls below threshold      |
| **Use Case**: Warehouse staff gets instant alert when product needs reorder |

### 3. **POS Transaction Broadcasting**

| Priority                                                                          | High |
| --------------------------------------------------------------------------------- | ---- |
| **Current**: Transactions stored locally, synced later                            |
| **Realtime Need**: Sales transactions broadcast to dashboard/reports in real-time |
| **Use Case**: Manager monitors live sales across all stores                       |

### 4. **Price Updates**

| Priority                                                                  | Medium |
| ------------------------------------------------------------------------- | ------ |
| **Current**: Product prices sync on manual trigger                        |
| **Realtime Need**: Price changes pushed instantly to all POS terminals    |
| **Use Case**: Flash sale prices take effect immediately across all stores |

### 5. **User Session Management**

| Priority                                                                       | Medium |
| ------------------------------------------------------------------------------ | ------ |
| **Current**: Local authentication only                                         |
| **Realtime Need**: Centralized session management with force logout capability |
| **Use Case**: Admin can revoke access instantly when employee leaves           |

### 6. **Purchase Order Status**

| Priority                                                         | Medium |
| ---------------------------------------------------------------- | ------ |
| **Current**: PO status updated manually                          |
| **Realtime Need**: PO status changes broadcast to relevant users |
| **Use Case**: Warehouse notified instantly when PO is approved   |

### 7. **Customer Queue/Order Status** (Future)

| Priority                                                                    | Low |
| --------------------------------------------------------------------------- | --- |
| **Current**: Not implemented                                                |
| **Realtime Need**: Customer-facing display showing order preparation status |
| **Use Case**: Pet grooming service queue display                            |

### 8. **Dashboard Analytics**

| Priority                                                      | Low |
| ------------------------------------------------------------- | --- |
| **Current**: Static reports loaded on page visit              |
| **Realtime Need**: Live updating charts and KPIs              |
| **Use Case**: Real-time revenue tracking on manager dashboard |

---

## Recommended Implementation

### Technology Options

| Option                   | Pros                                     | Cons                          |
| ------------------------ | ---------------------------------------- | ----------------------------- |
| **Supabase Realtime**    | Already using Supabase, easy integration | Limited to PostgreSQL changes |
| **Socket.io**            | Full control, flexible                   | Need to host server           |
| **Pusher/Ably**          | Managed service, reliable                | Additional cost               |
| **Firebase Realtime DB** | Easy setup                               | Different data model          |

### Suggested Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Electron App   │────▶│  Realtime Server │◀────│  Electron App   │
│  (Store A)      │     │  (WebSocket)     │     │  (Store B)      │
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │   PostgreSQL     │
                        │   (Supabase)     │
                        └──────────────────┘
```

### Event Types to Implement

```typescript
// Realtime event types
type RealtimeEvent =
  | { type: 'STOCK_UPDATE'; payload: { productId: string; storeId: string; quantity: number } }
  | {
      type: 'TRANSACTION_CREATED'
      payload: { transactionId: string; storeId: string; total: string }
    }
  | { type: 'PRICE_CHANGED'; payload: { productId: string; storeId: string; newPrice: string } }
  | { type: 'USER_LOGOUT'; payload: { userId: string } }
  | { type: 'PO_STATUS_CHANGED'; payload: { poId: string; status: string } }
  | { type: 'LOW_STOCK_ALERT'; payload: { productId: string; storeId: string; currentQty: number } }
```

---

## Implementation Priority

1. **Phase 1** (Critical for multi-store)
   - Multi-device inventory sync
   - POS transaction broadcasting
   - Live stock alerts

2. **Phase 2** (Enhanced operations)
   - Price updates
   - Purchase order status
   - User session management

3. **Phase 3** (Nice to have)
   - Dashboard analytics
   - Customer queue display

---

## Notes

- Current sync implementation uses `device_id` to track record origin - this is good foundation for realtime
- Conflict resolution (last-write-wins based on `updated_at`) should be maintained
- Consider offline-first approach: queue realtime events when offline, process when back online
