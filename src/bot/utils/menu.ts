import { InlineKeyboard } from 'grammy'

import type { AppContext } from '../index.ts'

export const MENU_MAIN = 'menu:main'
export const MENU_CARDS = 'menu:cards'
export const MENU_SUBS = 'menu:subs'
export const MENU_SUMMARY = 'menu:summary'
export const MENU_SETTINGS = 'menu:settings'

export const BACK_BUTTON_TEXT = '🏠 В меню'

export function mainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('📋 Подписки', MENU_SUBS)
    .text('💳 Карты', MENU_CARDS)
    .row()
    .text('📊 Сводка', MENU_SUMMARY)
    .text('⚙️ Настройки', MENU_SETTINGS)
}

export function mainMenuText(ctx: AppContext): string {
  const name = ctx.user.firstName ?? 'друг'
  return `Привет, ${name}! 👋\n\nЯ помогу трекать подписки и не пропускать списания.\n\nВыбери раздел:`
}

export async function renderMainMenu(ctx: AppContext) {
  const text = mainMenuText(ctx)
  const keyboard = mainMenuKeyboard()

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
