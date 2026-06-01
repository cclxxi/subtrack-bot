import { Hono } from 'hono'

import type { DrizzleDB } from '../../infra/database/drizzle'
import { webAppAuth } from '../middleware/webapp-auth.ts'
import { fail } from '../response.ts'
import type { AppEnv } from '../types.ts'
import { ValidationError } from '../validate.ts'
import { cardsRoutes } from './cards.ts'
import { settingsRoutes } from './settings.ts'
import { subscriptionsRoutes } from './subscriptions.ts'
import { summaryRoutes } from './summary.ts'

/**
 * Assembles the WebApp REST API under a single Hono instance:
 * Telegram initData auth on every route, a uniform error envelope, and the
 * per-resource routers. Mounted at `/api` by the main server.
 */
export function createApi(db: DrizzleDB): Hono<AppEnv> {
  const api = new Hono<AppEnv>()

  api.use('*', webAppAuth(db))

  api.route('/subscriptions', subscriptionsRoutes(db))
  api.route('/cards', cardsRoutes(db))
  api.route('/summary', summaryRoutes(db))
  api.route('/', settingsRoutes(db))

  api.onError((err, c) => {
    if (err instanceof ValidationError) {
      return c.json(fail(err.message), 400)
    }
    console.error('API error:', err)
    return c.json(fail('Internal server error'), 500)
  })

  return api
}
