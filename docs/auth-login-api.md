# Auth Login API Contract

This document defines the **/auth/login** endpoint contract expected by the frontend.

The backend should implement this contract and derive DB models (users, groups, permissions) from it.

---

## Endpoint

- **Method**: `POST`
- **Path**: `/auth/login`
- **Auth**: Public (no token required)
- **Content-Type**: `application/json`

---

## Request

### Body

```jsonc
{
  "email": "admin@example.com", // required, unique user identifier
  "password": "secret123" // required, plain text from FE, hash/check on BE
}
```

### Notes

- Frontend currently only enforces that `email` is a valid email and `password` has min length (6).
- Backend is free to implement any password policy, but this contract should not change.

---

## Successful Response (200)

On successful login, backend must return a **token** and the users **groups** and **permissions**.

```jsonc
{
  "token": "<jwt-or-session-token>",
  "groups": [
    "admin", // machine-readable group IDs (role names)
    "supervisor"
  ],
  "permissions": [
    "dashboard.view", // can view home dashboard
    "sales.view", // can open and use sales screen
    "settings.view", // can open Settings section
    "master.branch.manage", // can manage branches
    "master.user.manage", // can manage users
    "master.customer.manage", // can manage customers
    "settings.access-control.manage" // can manage roles & permissions
  ]
}
```

### Field definitions

- **`token`**: `string`
  - Required.
  - Opaque from FE perspective (usually JWT).
  - Stored in localStorage and attached as `Authorization: Bearer <token>` once real HTTP client is used.

- **`groups`**: `string[]`
  - Required (can be empty `[]`).
  - Each string is a **group/role identifier** (e.g. `"admin"`, `"cashier"`, `"supervisor"`).
  - Used for display/audit only in current FE; authorization is based on `permissions`, not `groups`.

- **`permissions`**: `string[]`
  - Required (can be empty `[]`).
  - Flat list of permission keys granted to the user, aggregated from their groups.
  - Frontend checks these strings in:
    - Route guards (`RoleGuard` uses `requiredPermissions`).
    - Side navigation visibility.
    - Potentially per-feature UI checks in the future.

### Permission keys currently used by FE

The FE expects the backend to use these permission keys (you can extend them, but these should exist):

- `dashboard.view` – can see the main dashboard (Home page).
- `sales.view` – can access and use the Sales (POS) page.
- `settings.view` – can see Settings section.
- `master.branch.manage` – can open and CRUD Branch master data.
- `master.user.manage` – can open and CRUD User master data.
- `master.customer.manage` – can open and CRUD Customer master data.
- `settings.access-control.manage` – can open Roles & Permissions management page.

The backend should maintain a master table of permissions that includes at least these keys.

---

## Error Responses

### Invalid credentials

- **Status**: `401 Unauthorized`

```jsonc
{
  "error": "INVALID_CREDENTIALS",
  "message": "Email or password is incorrect."
}
```

Frontend will display a generic error message; `error` codes are useful for debugging and future UX.

### Locked / disabled user (optional)

If required by business rules:

- **Status**: `403 Forbidden`

```jsonc
{
  "error": "USER_DISABLED",
  "message": "User account is disabled."
}
```

---

## Suggested Backend Data Model (high level)

This is not enforced by the FE, but recommended to support the contract:

- **users**
  - `id`: UUID / bigint
  - `email`: unique
  - `password_hash`: string
  - `is_active`: boolean
  - other profile fields ...

- **groups** (roles)
  - `id`: string (e.g. `"admin"`, `"cashier"`) or numeric
  - `name`: string
  - `description`: string

- **permissions**
  - `id`: string (permission key above, e.g. `"sales.view"`)
  - `description`: string

- **group_permissions** (many-to-many)
  - `group_id`
  - `permission_id`

- **user_groups** (many-to-many)
  - `user_id`
  - `group_id`

### Login flow (backend)

1. Validate `email` + `password` against `users` table.
2. Load groups for that user from `user_groups`.
3. Load permissions from `group_permissions` and `permissions` tables.
4. Generate `token` (JWT or similar) containing user id and optionally group ids.
5. Return response exactly matching this contract:

```jsonc
{
  "token": "...",
  "groups": ["admin", "cashier"],
  "permissions": ["sales.view", "master.customer.manage"]
}
```

This ensures the React app can immediately drive routing and UI visibility based purely on `permissions`.
