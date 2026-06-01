import { InlineKeyboard } from 'grammy'

import type { DrizzleDB } from '../../infra/database/drizzle'
import { updateUserSettings } from '../../services/users.ts'
import type { AppConversation, AppConversationContext } from '../index.ts'
import { BACK_BUTTON_TEXT, MENU_MAIN, MENU_SETTINGS } from '../utils/menu.ts'

export const EDIT_NOTIFICATION_HOUR_CONV = 'edit-notification-hour'

function doneKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('⚙️ К настройкам', MENU_SETTINGS)
    .text(BACK_BUTTON_TEXT, MENU_MAIN)
}

export function editNotificationHourConversation(db: DrizzleDB) {
  return async function editNotificationHour(
    conversation: AppConversation,
    ctx: AppConversationContext,
    userId: string,
  ) {
    await ctx.reply(
      'Во сколько присылать уведомления? Час по твоему часовому поясу, 0-23.\n\nНапример: 9 для 09:00 или 20 для 20:00.',
    )
    const hourCtx = await conversation.waitFor('message:text')
    const n = Number(hourCtx.message.text.trim())
    if (!Number.isInteger(n) || n < 0 || n > 23) {
      await hourCtx.reply(
        'Нужно целое число от 0 до 23. Открой /settings и попробуй ещё раз.',
        { reply_markup: doneKeyboard() },
      )
      return
    }
    await conversation.external(() =>
      updateUserSettings(db, userId, { notificationHour: n }),
    )
    await hourCtx.reply(
      `✅ Уведомления будут приходить в ${String(n).padStart(2, '0')}:00.`,
      { reply_markup: doneKeyboard() },
    )
  }
}
