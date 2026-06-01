import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Pool } from 'pg'

import * as schema from './schema/index.ts'

export type DrizzleDB = NodePgDatabase<typeof schema>

export function createDb(pool: Pool): DrizzleDB {
  return drizzle(pool, { schema })
}
