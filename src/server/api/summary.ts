import { Hono } from 'hono'

import type { DrizzleDB } from '../../infra/database/drizzle'
import { buildMonthlySummary } from '../../services/summary.ts'
import { ok } from '../response.ts'
import type { AppEnv } from '../types.ts'

export function summaryRoutes(db: DrizzleDB): Hono<AppEnv> {
  const app = new Hono<AppEnv>()

  app.get('/', async c => {
    const user = c.get('user')
    const summary = await buildMonthlySummary(db, user.id)
    return c.json(ok(summary))
  })

  return app
}
