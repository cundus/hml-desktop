import type { Config } from 'drizzle-kit'

export default {
  schema: './src/main/db/schema/*',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    // Local dev SQLite file used only for Drizzle tooling, not the Electron app
    url: process.env.DATABASE_URL ?? 'file:./dev.db'
  }
} satisfies Config
