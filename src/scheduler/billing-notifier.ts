import { Cron } from 'croner'
import type { Bot } from 'grammy'

import type { AppContext } from '../bot/index.ts'
import type { DrizzleDB } from '../infra/database/drizzle'
import {
  findNotifierCandidates,
  type NotifierCandidate,
  recordNotification,
} from '../services/notifications.ts'
import { advanceNextBillingDate } from '../services/subscriptions.ts'

export type TickResult = {
  candidates: number
  sent: number
  deduped: number
  errors: number
}

export async function processTick(
  db: DrizzleDB,
  bot: Bot<AppContext>,
): Promise<TickResult> {
  const candidates = await findNotifierCandidates(db)
  const result: TickResult = {
    candidates: candidates.length,
    sent: 0,
    deduped: 0,
    errors: 0,
  }

  for (const c of candidates) {
    const isNew = await recordNotification(
      db,
      c.subscriptionId,
      c.kind,
      c.daysBefore,
    )
    if (!isNew) {
      result.deduped++
      continue
    }

    try {
      await bot.api.sendMessage(c.telegramId, formatMessage(c))
      result.sent++
    } catch (err) {
      result.errors++
      console.error(
        `[notifier] sendMessage failed for sub ${c.subscriptionId}:`,
        err,
      )
    }

    if (c.kind === 'charge') {
      try {
        await advanceNextBillingDate(db, c.subscriptionId)
      } catch (err) {
        console.error(
          `[notifier] advance failed for sub ${c.subscriptionId}:`,
          err,
        )
      }
    }
  }

  return result
}

export function startBillingNotifier(
  db: DrizzleDB,
  bot: Bot<AppContext>,
): Cron {
  return new Cron(
    '0 * * * *',
    { name: 'billing-notifier', protect: true },
    async () => {
      const start = Date.now()
      try {
        const result = await processTick(db, bot)
        console.log(
          `[notifier] tick ${JSON.stringify(result)} in ${Date.now() - start}ms`,
        )
      } catch (err) {
        console.error('[notifier] tick crashed:', err)
      }
    },
  )
}

function formatMessage(c: NotifierCandidate): string {
  const money = `${c.amount} ${c.currency}`
  const dateRu = isoToRu(c.nextBillingDate)

  if (c.kind === 'charge') {
    return `💸 Сегодня списание\n\n«${c.name}» — ${money}`
  }
  if (c.daysBefore === 1) {
    return `📅 Завтра списание\n\n«${c.name}» — ${money}\n(${dateRu})`
  }
  return `📅 Через ${c.daysBefore} дн. списание\n\n«${c.name}» — ${money}\n(${dateRu})`
}

function isoToRu(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}
