import type { Config } from 'drizzle-kit'

export default {
  schema: './src/main/db/pg-schema/*',
  out: './drizzle-pg',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.PG_DATABASE_URL || process.env.DATABASE_URL || ''
  }
} satisfies Config
