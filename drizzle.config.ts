import type { Config } from 'drizzle-kit'

export default {
  schema: './src/main/db/pg-schema/*',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Local dev SQLite file used only for Drizzle tooling, not the Electron app
    url: process.env.DATABASE_URL || ''
  }
} satisfies Config
