import { type Bot, InlineKeyboard } from 'grammy'

import type { DrizzleDB } from '../../infra/database/drizzle'
import { getUserById } from '../../services/users.ts'
import { EDIT_NOTIFICATION_HOUR_CONV } from '../conversations/edit-notification-hour.ts'
import { EDIT_TIMEZONE_CONV } from '../conversations/edit-timezone.ts'
import type { AppContext } from '../index.ts'
import { safeAnswerCallback } from '../utils/answer.ts'
import { BACK_BUTTON_TEXT, MENU_MAIN } from '../utils/menu.ts'

async function renderSettings(db: DrizzleDB, ctx: AppContext) {
  // Re-fetch so the view always reflects the latest state, even right after
  // a settings-edit conversation (ctx.user is from auth middleware and may be
  // stale by one tick).
  const user = (await getUserById(db, ctx.user.id)) ?? ctx.user

  const text =
    `⚙️ Настройки\n\n` +
    `Часовой пояс: ${user.timezone}\n` +
    `Час уведомлений: ${String(user.notificationHour).padStart(2, '0')}:00`

  const keyboard = new InlineKeyboard()
    .text('⏰ Часовой пояс', 'settings:edit:tz')
    .row()
    .text('🕐 Час уведомлений', 'settings:edit:hour')
    .row()
    .text(BACK_BUTTON_TEXT, MENU_MAIN)

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

export function registerSettings(bot: Bot<AppContext>, db: DrizzleDB) {
  bot.command('settings', ctx => renderSettings(db, ctx))

  bot.callbackQuery('menu:settings', async ctx => {
    await safeAnswerCallback(ctx)
    await renderSettings(db, ctx)
  })

  bot.callbackQuery('settings:edit:tz', async ctx => {
    await safeAnswerCallback(ctx)
    await ctx.conversation.enter(EDIT_TIMEZONE_CONV, ctx.user.id)
  })

  bot.callbackQuery('settings:edit:hour', async ctx => {
    await safeAnswerCallback(ctx)
    await ctx.conversation.enter(EDIT_NOTIFICATION_HOUR_CONV, ctx.user.id)
  })
}
