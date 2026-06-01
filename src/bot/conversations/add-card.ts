import { InlineKeyboard } from 'grammy'

import type { DrizzleDB } from '../../infra/database/drizzle/index.ts'
import { createCard } from '../../services/cards.ts'
import type { AppConversation, AppConversationContext } from '../index.ts'
import { BACK_BUTTON_TEXT, MENU_CARDS, MENU_MAIN } from '../utils/menu.ts'

export const ADD_CARD_CONV = 'add-card'

function doneKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('💳 К картам', MENU_CARDS)
    .text(BACK_BUTTON_TEXT, MENU_MAIN)
}

export function addCardConversation(db: DrizzleDB) {
  return async function addCard(
    conversation: AppConversation,
    ctx: AppConversationContext,
    userId: string,
  ) {
    await ctx.reply('Как назовём карту? Например: «Т-Банк чёрная»')
    const labelCtx = await conversation.waitFor('message:text')
    const label = labelCtx.message.text.trim()
    if (label.length === 0 || label.length > 50) {
      await labelCtx.reply(
        'Название должно быть от 1 до 50 символов. Открой /cards и начни заново.',
        { reply_markup: doneKeyboard() },
      )
      return
    }

    await labelCtx.reply('Последние 4 цифры карты?')
    const last4Ctx = await conversation.waitFor('message:text')
    const last4 = last4Ctx.message.text.trim()
    if (!/^\d{4}$/.test(last4)) {
      await last4Ctx.reply(
        'Нужно ровно 4 цифры. Открой /cards и начни заново.',
        { reply_markup: doneKeyboard() },
      )
      return
    }

    await conversation.external(() => createCard(db, { userId, label, last4 }))

    await last4Ctx.reply(`✅ Карта «${label}» (…${last4}) добавлена.`, {
      reply_markup: doneKeyboard(),
    })
  }
}
