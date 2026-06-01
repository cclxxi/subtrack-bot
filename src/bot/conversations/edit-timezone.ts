import { InlineKeyboard } from 'grammy'

import type { DrizzleDB } from '../../infra/database/drizzle'
import {
  isValidIanaTimezone,
  updateUserSettings,
} from '../../services/users.ts'
import type { AppConversation, AppConversationContext } from '../index.ts'
import { BACK_BUTTON_TEXT, MENU_MAIN, MENU_SETTINGS } from '../utils/menu.ts'

export const EDIT_TIMEZONE_CONV = 'edit-timezone'

function doneKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('⚙️ К настройкам', MENU_SETTINGS)
    .text(BACK_BUTTON_TEXT, MENU_MAIN)
}

export function editTimezoneConversation(db: DrizzleDB) {
  return async function editTimezone(
    conversation: AppConversation,
    ctx: AppConversationContext,
    userId: string,
  ) {
    await ctx.reply(
      'Введи IANA часовой пояс.\n\nПримеры: Europe/Moscow, Europe/Berlin, Asia/Almaty, America/New_York',
    )
    const tzCtx = await conversation.waitFor('message:text')
    const tz = tzCtx.message.text.trim()
    if (!isValidIanaTimezone(tz)) {
      await tzCtx.reply(
        'Не похоже на IANA-зону. Открой /settings и попробуй ещё раз.',
        { reply_markup: doneKeyboard() },
      )
      return
    }
    await conversation.external(() =>
      updateUserSettings(db, userId, { timezone: tz }),
    )
    await tzCtx.reply(`✅ Часовой пояс обновлён: ${tz}`, {
      reply_markup: doneKeyboard(),
    })
  }
}
