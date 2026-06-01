import { type Bot, InlineKeyboard } from 'grammy'

import type { DrizzleDB } from '../../infra/database/drizzle'
import { buildMonthlySummary } from '../../services/summary.ts'
import type { AppContext } from '../index.ts'
import { safeAnswerCallback } from '../utils/answer.ts'
import { BACK_BUTTON_TEXT, MENU_MAIN, MENU_SUMMARY } from '../utils/menu.ts'

function fmt(n: number): string {
  return n.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function isoToRu(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}`
}

async function renderSummary(db: DrizzleDB, ctx: AppContext) {
  const summary = await buildMonthlySummary(db, ctx.user.id)

  const lines: string[] = ['📊 Сводка', '']

  if (summary.activeCount === 0) {
    lines.push('У тебя пока нет активных подписок.')
  } else {
    lines.push(`Активных подписок: ${summary.activeCount}`)
    lines.push('')
    lines.push('В среднем в месяц:')
    for (const t of summary.totalsByCurrency) {
      lines.push(`  ${fmt(t.monthly)} ${t.currency}`)
    }

    if (summary.upcoming.length > 0) {
      lines.push('')
      lines.push('Ближайшие списания (30 дн.):')
      for (const u of summary.upcoming) {
        lines.push(
          `  • ${isoToRu(u.nextBillingDate)} — ${u.name} (${u.amount} ${u.currency})`,
        )
      }
    }
  }

  const keyboard = new InlineKeyboard()
    .text('🔄 Обновить', MENU_SUMMARY)
    .text(BACK_BUTTON_TEXT, MENU_MAIN)
  const text = lines.join('\n')

  if (ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(text, { reply_markup: keyboard })
      return
    } catch {
      // fall through
    }
  }
  await ctx.reply(text, { reply_markup: keyboard })
}

export function registerSummary(bot: Bot<AppContext>, db: DrizzleDB) {
  bot.command('summary', ctx => renderSummary(db, ctx))

  bot.callbackQuery('menu:summary', async ctx => {
    await safeAnswerCallback(ctx)
    await renderSummary(db, ctx)
  })
}
