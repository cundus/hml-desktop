---
trigger: always_on
---

# Project Constraints

## Database Strategy (Cloud-First)
- Every DB query MUST go to **cloud (PostgreSQL) first**
- If cloud is unavailable, fall back to **local DB (SQLite via sql.js)**
- Financial reports (`getProfitLossReport`, `getSalesSummary`) are **strictly cloud-only** when online — never fall back to stale local data
- Write operations: cloud if online, queue if offline (via `QueueService`)
- Use `CloudFirstBaseService` as the base class for all cloud-first services

## UI Components
- Sebisa mungkin, component UI dibuat **terpisah dan modular**
- Pages should compose from smaller reusable components
- Keep components focused: one component = one responsibility

## Type Checking
- For type checking, run: `npx tsc --noEmit`
- Separate configs: `tsconfig.node.json` (main/preload), `tsconfig.web.json` (renderer)
- Full typecheck command: `npm run typecheck` (runs both node + web)

## Language
- Code comments and variable names: **English**
- UI labels and user-facing text: **Bahasa Indonesia** (unless explicitly stated)
- AI conversations and docs: follow user's language preference
