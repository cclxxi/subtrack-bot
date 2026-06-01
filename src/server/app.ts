import { type Bot, webhookCallback } from 'grammy'
import { Hono } from 'hono'

import type { AppContext } from '../bot/index.ts'
import { env } from '../env.ts'
import type { DrizzleDB } from '../infra/database/drizzle'
import { processTick } from '../scheduler/billing-notifier.ts'

export function createServer(bot: Bot<AppContext>, db: DrizzleDB): Hono {
  const app = new Hono()

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

  return app
}
