import { type Bot } from 'grammy'

import type { AppContext } from '../index.ts'
import { safeAnswerCallback } from '../utils/answer.ts'
import {
  mainMenuKeyboard,
  mainMenuText,
  MENU_MAIN,
  renderMainMenu,
} from '../utils/menu.ts'

export function registerStart(bot: Bot<AppContext>) {
  bot.command('start', async ctx => {
    await ctx.reply(mainMenuText(ctx), { reply_markup: mainMenuKeyboard() })
  })

  bot.callbackQuery(MENU_MAIN, async ctx => {
    await safeAnswerCallback(ctx)
    await renderMainMenu(ctx)
  })
}
