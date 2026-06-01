import { type Bot, InlineKeyboard } from 'grammy'

import type { DrizzleDB } from '../../infra/database/drizzle'
import { humanInterval } from '../../lib/billing.ts'
import {
  deactivateSubscription,
  listSubscriptionsForUser,
} from '../../services/subscriptions.ts'
import { ADD_SUB_CONV } from '../conversations/add-subscription.ts'
import type { AppContext } from '../index.ts'
import { safeAnswerCallback } from '../utils/answer.ts'
import { BACK_BUTTON_TEXT, MENU_MAIN } from '../utils/menu.ts'

async function renderSubsList(db: DrizzleDB, ctx: AppContext) {
  const list = await listSubscriptionsForUser(db, ctx.user.id)

  const keyboard = new InlineKeyboard()
  let text: string

  if (list.length === 0) {
    text = '📋 У тебя пока нет подписок.'
  } else {
    const lines = list.map(
      s =>
        `• ${s.name} — ${s.amount} ${s.currency} / ${humanInterval(s.interval, s.intervalDays)}\n  след. списание: ${s.nextBillingDate}`,
    )
    text = `📋 Подписки (${list.length}):\n\n${lines.join('\n\n')}`
    for (const s of list) {
      keyboard.text(`🗑 ${s.name}`, `sub:delete:${s.id}`).row()
    }
  }
  keyboard.text('➕ Добавить подписку', 'sub:add').row()
  keyboard.text(BACK_BUTTON_TEXT, MENU_MAIN)

  if (ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(text, { reply_markup: keyboard })
      return
    } catch {
      // edit failed — fall through to reply
    }
  }
  await ctx.reply(text, { reply_markup: keyboard })
}

export function registerSubs(bot: Bot<AppContext>, db: DrizzleDB) {
  bot.command('subs', ctx => renderSubsList(db, ctx))

  bot.callbackQuery('menu:subs', async ctx => {
    await safeAnswerCallback(ctx)
    await renderSubsList(db, ctx)
  })

  bot.callbackQuery('sub:add', async ctx => {
    await safeAnswerCallback(ctx)
    await ctx.conversation.enter(ADD_SUB_CONV, ctx.user.id)
  })

  bot.callbackQuery(/^sub:delete:(.+)$/, async ctx => {
    const id = (ctx.match as RegExpMatchArray)[1]
    if (!id) {
      await safeAnswerCallback(ctx, 'Ошибка')
      return
    }
    const ok = await deactivateSubscription(db, ctx.user.id, id)
    await safeAnswerCallback(ctx, ok ? 'Подписка удалена' : 'Не удалось')
    if (ok) await renderSubsList(db, ctx)
  })
}
