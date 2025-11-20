# Next TODOs

## 1. Testing & Validation

- [ ] Test all master data CRUD with sql.js  
  - [ ] Category: create / read / update / soft delete / restore / persistence  
  - [ ] Supplier: create / read / update / soft delete / persistence  
  - [ ] Store: create / read / update / soft delete / persistence  
  - [ ] Customer Category: create / read / update / soft delete / persistence  
  - [ ] User: create / read / update / soft delete / restore / login flow still OK  
  - [ ] Product: create / read / update / search / toggle active / soft delete / restore  

## 2. Sync Service Refactor (Cloud Only)

- [ ] Update [SyncService](cci:2://file:///c:/Users/NB-LE/Documents/project/template/hml-desktop/src/main/services/sync.service.ts:19:0-139:1) to drop local `BetterSQLite3Database` usage  
- [ ] Keep only Drizzle + `pg` for Postgres connection  
- [ ] Define clear sync contracts (what entities sync, direction, conflict rules)  
- [ ] Expose sync status and actions via IPC (if not already)

## 3. Local ↔ Cloud Sync Logic

- [ ] Design sync strategy between local sql.js DB and cloud Postgres  
  - [ ] Identify entities to sync (User, Product, Category, etc.)  
  - [ ] Define “source of truth” per entity  
  - [ ] Define conflict resolution rules (last-write-wins, versioning, etc.)  
- [ ] Implement pull (cloud → local)  
- [ ] Implement push (local → cloud)  
- [ ] Implement initial full sync  
- [ ] Add minimal logging for sync runs

## 4. Automated Tests (Nice to Have, but Important)

- [ ] Add unit tests for sql.js services (Category, Supplier, Store, CustomerCategory, User, Product)  
- [ ] Add integration test for basic CRUD + persistence  
- [ ] Add basic test for sync flows once implemented

## 5. Future Enhancements

- [ ] Replace mock auth/permissions catalog with DB-backed RBAC (Permissions & Roles from DB)  
- [ ] Add simple migration/versioning strategy for local DB schema changes  
- [ ] Performance test with realistic data volume (e.g. 5k–10k products)