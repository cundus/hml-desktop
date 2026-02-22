---
description: Create and run database migrations using Drizzle ORM
---

# Database Migration

## PostgreSQL Schema Changes

### 1. Edit the Drizzle Schema
Modify or create files in `src/main/db/pg-schema/`:
- Tables use `pgTable()` from `drizzle-orm/pg-core`
- Export new tables from `src/main/db/pg-schema/index.ts`

### 2. Generate Migration
```bash
npm run drizzle:generate
```
This uses `drizzle.config.ts` (pointing to `src/main/db/pg-schema/*`).
Output: migration SQL files in `drizzle/` directory.

### 3. Push to Cloud DB
```bash
npm run drizzle:push
```
Applies schema changes directly to the PostgreSQL database.

### 4. Run Migrations
```bash
npm run drizzle:migrate
```
Runs generated migration files against the database.

## Local SQLite Schema Changes

### 1. Edit `src/main/localDb.ts`
Add or modify table creation statements in the `initializeSchema()` function.
SQLite tables are created using raw SQL via `sql.js`.

### 2. Seed Data (if needed)
Add seed logic to `src/main/seed.ts` in the appropriate function.

## Configuration Files
- `drizzle.config.ts` — PostgreSQL config (schema: `src/main/db/pg-schema/*`)
- `drizzle.pg.config.ts` — Alternate PG config
- `DATABASE_URL` env var required for Drizzle CLI commands

## Notes
- Drizzle schema is only used for PostgreSQL (`pg` driver)
- Local SQLite uses raw SQL (no ORM), managed in `localDb.ts`
- Always update BOTH local SQLite schema AND PG schema when adding tables
- Migration files are stored in `drizzle/` (PG) and `drizzle-pg/` directories
