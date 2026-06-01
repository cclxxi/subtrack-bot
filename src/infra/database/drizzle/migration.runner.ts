import { migrate } from 'drizzle-orm/node-postgres/migrator'

import { env } from '../../../env.ts'
import { createPool } from './connection.provider.ts'
import { createDb } from './drizzle.provider.ts'

const pool = await createPool({
  host: env.DATABASE_HOST,
  port: env.DATABASE_PORT,
  user: env.DATABASE_USERNAME,
  password: env.DATABASE_PASSWORD,
  database: env.DATABASE_NAME,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
})

const db = createDb(pool)

console.log('Running Drizzle migrations…')
await migrate(db, { migrationsFolder: env.DRIZZLE_OUT })
console.log('Migrations completed.')

await pool.end()
