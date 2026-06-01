import { createBot } from './bot/index.ts'
import { env } from './env.ts'
import { createDb, createPool } from './infra/database/drizzle/index.ts'
import { startBillingNotifier } from './scheduler/billing-notifier.ts'
import { createServer } from './server/app.ts'

const pool = await createPool({
  host: env.DATABASE_HOST,
  port: env.DATABASE_PORT,
  user: env.DATABASE_USERNAME,
  password: env.DATABASE_PASSWORD,
  database: env.DATABASE_NAME,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
})

const db = createDb(pool)
const bot = createBot(db)
const app = createServer(bot, db)

if (env.BOT_MODE === 'webhook') {
  if (!env.BOT_WEBHOOK_URL || !env.BOT_WEBHOOK_SECRET) {
    throw new Error(
      'BOT_WEBHOOK_URL and BOT_WEBHOOK_SECRET are required when BOT_MODE=webhook',
    )
  }
  await bot.init()
  await bot.api.setWebhook(env.BOT_WEBHOOK_URL, {
    secret_token: env.BOT_WEBHOOK_SECRET,
    drop_pending_updates: true,
  })
  console.log(`Webhook set: ${env.BOT_WEBHOOK_URL}`)
} else {
  void bot.start({
    drop_pending_updates: true,
    onStart: me => console.log(`Bot @${me.username} started (polling)`),
  })
}

// Register the persistent chat menu button that launches the Mini App.
if (env.WEBAPP_URL) {
  await bot.api.setChatMenuButton({
    menu_button: {
      type: 'web_app',
      text: 'Подписки',
      web_app: { url: env.WEBAPP_URL },
    },
  })
  console.log(`WebApp menu button set: ${env.WEBAPP_URL}`)
}

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
})

console.log(`HTTP server: http://localhost:${server.port}`)

const notifier = startBillingNotifier(db, bot)
console.log(`Billing notifier: ${notifier.getPattern() ?? '?'}`)

const shutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}, shutting down…`)
  notifier.stop()
  await bot.stop()
  server.stop()
  await pool.end()
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
