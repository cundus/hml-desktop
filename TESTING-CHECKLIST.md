# Master Data CRUD Testing Checklist (sql.js Migration)

## Test Environment
- **Database**: sql.js (pure JavaScript/WASM)
- **Location**: `%APPDATA%/petshop-management-system/petshop-local.db`
- **Services**: Category, Supplier, Store, CustomerCategory

---

## 1. Category Testing

### Navigation
- [ ] Open app → Settings → Master Data → Categories
- [ ] Page loads without errors
- [ ] Empty state or existing categories display

### Create
- [ ] Click "New Category" or "Add" button
- [ ] Enter name: "Test Category 1"
- [ ] Click Save
- [ ] **Expected**: Category appears in list
- [ ] **Expected**: Success message shown

### Read/List
- [ ] Categories list displays all non-deleted items
- [ ] Sorting by name works (ASC)
- [ ] Each category shows: name, created date, updated date

### Update
- [ ] Click Edit on "Test Category 1"
- [ ] Change name to "Updated Category 1"
- [ ] Click Save
- [ ] **Expected**: Name updates in list
- [ ] **Expected**: Updated timestamp changes

### Soft Delete
- [ ] Click Delete on "Updated Category 1"
- [ ] Confirm deletion
- [ ] **Expected**: Category disappears from list
- [ ] **Expected**: Category still exists in DB with `deletedAt` set

### Restore (if UI supports)
- [ ] If restore button exists, click it
- [ ] **Expected**: Category reappears in list
- [ ] **Expected**: `deletedAt` is NULL

### Persistence
- [ ] Close the app completely
- [ ] Reopen the app
- [ ] Navigate back to Categories
- [ ] **Expected**: All changes persisted (categories still there)

---

## 2. Supplier Testing

### Navigation
- [ ] Settings → Master Data → Suppliers
- [ ] Page loads without errors

### Create
- [ ] Click "New Supplier"
- [ ] Enter:
  - Name: "Test Supplier Co."
  - Phone: "021-1234567"
  - Address: "Jl. Test No. 123"
- [ ] Click Save
- [ ] **Expected**: Supplier appears in list

### Read/List
- [ ] Suppliers list displays correctly
- [ ] All fields visible: name, phone, address

### Update
- [ ] Edit "Test Supplier Co."
- [ ] Change phone to "021-9999999"
- [ ] Change address to "Jl. Updated No. 456"
- [ ] Click Save
- [ ] **Expected**: Changes reflected in list

### Soft Delete
- [ ] Delete "Test Supplier Co."
- [ ] **Expected**: Supplier removed from list

### Persistence
- [ ] Restart app
- [ ] Check suppliers still exist

---

## 3. Store Testing

### Navigation
- [ ] Settings → Master Data → Stores
- [ ] Page loads without errors

### Create
- [ ] Click "New Store"
- [ ] Enter:
  - Code: "STR-001"
  - Name: "Main Store"
  - Address: "Jl. Main No. 1"
  - Type: "warehouse" or "retail" (depending on UI)
- [ ] Click Save
- [ ] **Expected**: Store appears in list

### Read/List
- [ ] Stores list displays all fields
- [ ] Code is unique (try creating duplicate code)
- [ ] **Expected**: Duplicate code should fail or warn

### Update
- [ ] Edit "Main Store"
- [ ] Change name to "Main Store Updated"
- [ ] Change type if applicable
- [ ] Click Save
- [ ] **Expected**: Updates reflected

### Soft Delete
- [ ] Delete "Main Store Updated"
- [ ] **Expected**: Store removed from list

### Persistence
- [ ] Restart app
- [ ] Verify stores persist

---

## 4. Customer Category Testing

### Navigation
- [ ] Settings → Master Data → Customer Categories
- [ ] Page loads without errors

### Create
- [ ] Click "New Customer Category"
- [ ] Enter name: "VIP Customer"
- [ ] Click Save
- [ ] **Expected**: Category appears in list

### Read/List
- [ ] Customer categories display correctly
- [ ] Sorted by name

### Update
- [ ] Edit "VIP Customer"
- [ ] Change to "Premium VIP Customer"
- [ ] Click Save
- [ ] **Expected**: Name updated

### Soft Delete
- [ ] Delete "Premium VIP Customer"
- [ ] **Expected**: Removed from list

### Persistence
- [ ] Restart app
- [ ] Verify customer categories persist

---

## 5. Cross-Entity Testing

### Multiple Records
- [ ] Create 5+ categories
- [ ] Create 5+ suppliers
- [ ] Create 3+ stores
- [ ] Create 3+ customer categories
- [ ] **Expected**: All display correctly, no performance issues

### Concurrent Operations
- [ ] Create a category
- [ ] Immediately create a supplier
- [ ] **Expected**: Both save correctly
- [ ] **Expected**: No database lock errors

### Special Characters
- [ ] Create category with name: "Test & Special <Characters>"
- [ ] Create supplier with address containing quotes: "Jl. O'Brien St."
- [ ] **Expected**: Special characters saved and displayed correctly

### Empty/Null Fields
- [ ] Create supplier with:
  - Name: "Minimal Supplier"
  - Phone: (leave empty)
  - Address: (leave empty)
- [ ] **Expected**: Saves successfully with NULL values

---

## 6. Error Handling

### Required Fields
- [ ] Try creating category without name
- [ ] **Expected**: Validation error shown
- [ ] Try creating store without code
- [ ] **Expected**: Validation error shown

### Network/DB Errors
- [ ] While app is running, check console for any errors
- [ ] **Expected**: No unhandled promise rejections
- [ ] **Expected**: No "database locked" errors

---

## 7. Database File Verification

### File Location
- [ ] Navigate to: `%APPDATA%/petshop-management-system/`
- [ ] **Expected**: `petshop-local.db` file exists
- [ ] Check file size > 0 bytes

### Manual Inspection (Optional)
- [ ] Use DB Browser for SQLite or similar tool
- [ ] Open `petshop-local.db`
- [ ] Verify tables exist:
  - `category`
  - `supplier`
  - `store`
  - `customer_category`
- [ ] Verify data matches what you created in UI

---

## 8. Console Logs

### Expected Logs on Startup
```
✓ Local database loaded: <path>
✓ Database tables initialized
✓ Master data services initialized (sql.js)
```

### No Errors Expected
- [ ] No "better-sqlite3" errors
- [ ] No "NODE_MODULE_VERSION" errors
- [ ] No "node-gyp" errors
- [ ] No unhandled promise rejections

---

## Test Results Summary

**Date**: ___________  
**Tester**: ___________

| Entity | Create | Read | Update | Delete | Restore | Persist | Status |
|--------|--------|------|--------|--------|---------|---------|--------|
| Category | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ PASS / ☐ FAIL |
| Supplier | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ PASS / ☐ FAIL |
| Store | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ PASS / ☐ FAIL |
| CustomerCategory | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ PASS / ☐ FAIL |

**Issues Found**:
1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

**Overall Result**: ☐ PASS / ☐ FAIL

---

## Known Issues to Watch For

1. **TypeScript warnings about `SqlValue`**: These are harmless lint warnings, app should work fine
2. **First-time DB creation**: On very first run, tables are created - verify no errors
3. **Auto-save timing**: Database saves after every write - check no "file busy" errors

---

## Next Steps After Testing

- [ ] If all tests pass → Mark TODO as complete
- [ ] If issues found → Document them and fix before proceeding
- [ ] Consider adding automated tests for these CRUD operations
- [ ] Proceed to migrate remaining services (User, Product, etc.)
