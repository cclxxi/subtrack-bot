import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/infra/database/drizzle/schema/index.ts',
  out: process.env.DRIZZLE_OUT ?? './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DATABASE_HOST!,
    port: Number(process.env.DATABASE_PORT ?? 5432),
    user: process.env.DATABASE_USERNAME!,
    password: process.env.DATABASE_PASSWORD!,
    database: process.env.DATABASE_NAME!,
    ssl: process.env.DATABASE_SSL === 'true',
  },
  strict: true,
  verbose: true,
})
