import { type Bot, InlineKeyboard } from 'grammy'

import type { DrizzleDB } from '../../infra/database/drizzle/index.ts'
import { archiveCard, listCardsForUser } from '../../services/cards.ts'
import { ADD_CARD_CONV } from '../conversations/add-card.ts'
import type { AppContext } from '../index.ts'
import { safeAnswerCallback } from '../utils/answer.ts'
import { BACK_BUTTON_TEXT, MENU_MAIN } from '../utils/menu.ts'

async function renderCardsList(db: DrizzleDB, ctx: AppContext) {
  const list = await listCardsForUser(db, ctx.user.id)

  const keyboard = new InlineKeyboard()
  for (const card of list) {
    keyboard
      .text(`🗑 ${card.label} …${card.last4}`, `card:archive:${card.id}`)
      .row()
  }
  keyboard.text('➕ Добавить карту', 'card:add').row()
  keyboard.text(BACK_BUTTON_TEXT, MENU_MAIN)

  const text =
    list.length === 0
      ? '💳 У тебя пока нет карт.'
      : `💳 Твои карты (${list.length}):`

  if (ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(text, { reply_markup: keyboard })
      return
    } catch {
      // message can't be edited (too old, identical, etc.) → fall through to reply
    }
  }
  await ctx.reply(text, { reply_markup: keyboard })
}

export function registerCards(bot: Bot<AppContext>, db: DrizzleDB) {
  bot.command('cards', ctx => renderCardsList(db, ctx))

  bot.callbackQuery('menu:cards', async ctx => {
    await safeAnswerCallback(ctx)
    await renderCardsList(db, ctx)
  })

  bot.callbackQuery('card:add', async ctx => {
    await safeAnswerCallback(ctx)
    await ctx.conversation.enter(ADD_CARD_CONV, ctx.user.id)
  })

  bot.callbackQuery(/^card:archive:(.+)$/, async ctx => {
    const cardId = (ctx.match as RegExpMatchArray)[1]
    if (!cardId) {
      await safeAnswerCallback(ctx, 'Ошибка')
      return
    }
    const ok = await archiveCard(db, ctx.user.id, cardId)
    await safeAnswerCallback(ctx, ok ? 'Карта удалена' : 'Не удалось')
    if (ok) await renderCardsList(db, ctx)
  })
}
