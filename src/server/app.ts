import { type Bot, webhookCallback } from 'grammy'
import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'

import type { AppContext } from '../bot/index.ts'
import { env } from '../env.ts'
import type { DrizzleDB } from '../infra/database/drizzle'
import { processTick } from '../scheduler/billing-notifier.ts'
import { createApi } from './api/index.ts'
import type { AppEnv } from './types.ts'

const WEBAPP_DIST = './web/dist'

export function createServer(
  bot: Bot<AppContext>,
  db: DrizzleDB,
): Hono<AppEnv> {
  const app = new Hono<AppEnv>()

  app.get('/healthz', c => c.json({ status: 'ok' }))

  if (env.BOT_MODE === 'webhook') {
    app.post('/tg/webhook', async c => {
      if (
        c.req.header('x-telegram-bot-api-secret-token') !==
        env.BOT_WEBHOOK_SECRET
      ) {
        return c.body(null, 401)
      }
      return webhookCallback(bot, 'hono')(c)
    })
  }

  if (env.NODE_ENV !== 'production') {
    app.post('/api/_debug/tick', async c => {
      const result = await processTick(db, bot)
      return c.json(result)
    })
  }

  app.route('/api', createApi(db))

  // Serve the built Mini App SPA from the same origin. Registered after the
  // API so /api and /tg/webhook always take precedence; the wildcard falls
  // back to index.html for client-side routing.
  if (env.SERVE_WEBAPP) {
    app.use('/assets/*', serveStatic({ root: WEBAPP_DIST }))
    app.get('/', serveStatic({ path: `${WEBAPP_DIST}/index.html` }))
    app.get('*', serveStatic({ path: `${WEBAPP_DIST}/index.html` }))
  }

  return app
}
