# Next Tasks

## High Priority

- **Cloud Sync Flow**
  - Implement full cloud sync flow: manual sync button, push local changes to cloud, and basic conflict handling.
  - Integrate with existing `SyncButton` and new setup step so the behavior is consistent.

- **Branch / Store Filtering in Services**
  - Apply `store_id` / branch filtering consistently across all read/write services:
    - Transactions / sales
    - Inventory (stocks, transactions, pricing, batches)
    - Purchasing
    - Reports / dashboards
  - Use the existing `useStoreFilter()` hook in the renderer to decide which `storeId` to pass when querying.

## Medium Priority

- **App Settings (App Config) Page Enhancements**
  - Refine UX for viewing and changing:
    - Branch and HQ info
    - Store manager
    - Cloud DB URL
  - Add guardrails and confirmations when changing branch or resetting configuration.

- **Permissions Hardening**
  - Map permissions to pages and key actions (e.g. `dashboard.view`, `settings.app-config.manage`, `sales.pos`, etc.).
  - Ensure:
    - Side navigation hides items the user cannot access.
    - Route guards (`RoleGuard`) enforce the same rules.
    - Sensitive actions (delete, approve, configuration changes) are permission-gated, not only menu-hidden.

- **Initial Setup & Login Flow QA**
  - Test key scenarios:
    - Fresh device with no configuration.
    - Invalid or unreachable cloud DB URL.
    - No stores / no users after cloud sync.
    - Low-permission user (no dashboard permission, POS-only, inventory-only, etc.).
  - Verify redirects:
    - To `/setup` when not configured.
    - To welcome screen when user lacks `dashboard.view`.
