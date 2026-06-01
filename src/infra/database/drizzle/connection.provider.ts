import { Pool, type PoolConfig } from 'pg'

export async function createPool(config: PoolConfig): Promise<Pool> {
  const pool = new Pool(config)
  await pool.query('SELECT 1')
  return pool
}

export type { Pool, PoolConfig }
