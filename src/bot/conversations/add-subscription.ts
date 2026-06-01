import { InlineKeyboard } from 'grammy'

import type { DrizzleDB } from '../../infra/database/drizzle'
import { humanInterval, type IntervalKind } from '../../lib/billing.ts'
import { parseUserDate } from '../../lib/dates.ts'
import { listCardsForUser } from '../../services/cards.ts'
import { createSubscription } from '../../services/subscriptions.ts'
import type { AppConversation, AppConversationContext } from '../index.ts'
import { safeAnswerCallback } from '../utils/answer.ts'
import { BACK_BUTTON_TEXT, MENU_MAIN, MENU_SUBS } from '../utils/menu.ts'

export const ADD_SUB_CONV = 'add-subscription'

const PRESET_CURRENCIES = ['RUB', 'USD', 'EUR'] as const

function doneKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('📋 К подпискам', MENU_SUBS)
    .text(BACK_BUTTON_TEXT, MENU_MAIN)
}

export function addSubscriptionConversation(db: DrizzleDB) {
  return async function addSub(
    conversation: AppConversation,
    ctx: AppConversationContext,
    userId: string,
  ) {
    // 1. Name
    await ctx.reply('Как называется подписка? Например: «Netflix»')
    const nameCtx = await conversation.waitFor('message:text')
    const name = nameCtx.message.text.trim()
    if (name.length === 0 || name.length > 50) {
      await nameCtx.reply(
        'Название от 1 до 50 символов. Открой /subs и начни заново.',
        { reply_markup: doneKeyboard() },
      )
      return
    }

    // 2. Amount
    await nameCtx.reply('Сколько стоит? Просто число, например: 990 или 9.99')
    const amountCtx = await conversation.waitFor('message:text')
    const amount = Number(amountCtx.message.text.trim().replace(',', '.'))
    if (!Number.isFinite(amount) || amount <= 0) {
      await amountCtx.reply(
        'Нужно положительное число. /subs — попробуй заново.',
        { reply_markup: doneKeyboard() },
      )
      return
    }

    // 3. Currency
    const currencyKb = new InlineKeyboard()
    for (const cur of PRESET_CURRENCIES) currencyKb.text(cur, `currency:${cur}`)
    currencyKb.row().text('Другая (ввести)', 'currency:custom')
    await amountCtx.reply('В какой валюте?', { reply_markup: currencyKb })
    const currencyCb = await conversation.waitForCallbackQuery(/^currency:/)
    await safeAnswerCallback(currencyCb)
    const currencyChoice = currencyCb.callbackQuery.data!.split(':')[1]!

    let currency: string
    if (currencyChoice === 'custom') {
      await currencyCb.reply('Код валюты (3 латинские буквы), например: GBP')
      const customCurCtx = await conversation.waitFor('message:text')
      const code = customCurCtx.message.text.trim().toUpperCase()
      if (!/^[A-Z]{3}$/.test(code)) {
        await customCurCtx.reply(
          'Нужно ровно 3 латинские буквы. /subs — заново.',
          { reply_markup: doneKeyboard() },
        )
        return
      }
      currency = code
    } else {
      currency = currencyChoice
    }

    // 4. Interval
    const intervalKb = new InlineKeyboard()
      .text('Месяц', 'interval:month')
      .text('Год', 'interval:year')
      .row()
      .text('Неделя', 'interval:week')
      .text('День', 'interval:day')
      .row()
      .text('Другое (N дней)', 'interval:custom')
    await currencyCb.reply('Как часто списывается?', {
      reply_markup: intervalKb,
    })
    const intervalCb = await conversation.waitForCallbackQuery(/^interval:/)
    await safeAnswerCallback(intervalCb)
    const interval = intervalCb.callbackQuery.data!.split(
      ':',
    )[1] as IntervalKind

    let intervalDays: number | null = null
    if (interval === 'custom') {
      await intervalCb.reply('Раз в сколько дней?')
      const idCtx = await conversation.waitFor('message:text')
      const n = Number(idCtx.message.text.trim())
      if (!Number.isInteger(n) || n <= 0 || n > 3650) {
        await idCtx.reply('Нужно целое число от 1 до 3650. /subs — заново.', {
          reply_markup: doneKeyboard(),
        })
        return
      }
      intervalDays = n
    }

    // 5. Next billing date
    await intervalCb.reply(
      'Когда следующее списание?\n\nФорматы: ГГГГ-ММ-ДД, ДД.ММ.ГГГГ, ДД.ММ, «сегодня», «завтра», +N (через N дней)',
    )
    const dateCtx = await conversation.waitFor('message:text')
    const nextBillingDate = parseUserDate(dateCtx.message.text.trim())
    if (!nextBillingDate) {
      await dateCtx.reply('Не распознал дату. /subs — попробуй ещё раз.', {
        reply_markup: doneKeyboard(),
      })
      return
    }

    // 6. Card
    const userCards = await conversation.external(() =>
      listCardsForUser(db, userId),
    )
    const cardKb = new InlineKeyboard()
    for (const c of userCards) {
      cardKb.text(`${c.label} …${c.last4}`, `pickcard:${c.id}`).row()
    }
    cardKb.text('Без карты', 'pickcard:none')
    await dateCtx.reply('С какой карты списывается?', { reply_markup: cardKb })
    const cardCb = await conversation.waitForCallbackQuery(/^pickcard:/)
    await safeAnswerCallback(cardCb)
    const cardChoice = cardCb.callbackQuery.data!.split(':')[1]!
    const cardId = cardChoice === 'none' ? null : cardChoice

    // 7. Save
    await conversation.external(() =>
      createSubscription(db, {
        userId,
        name,
        amount: amount.toFixed(2),
        currency,
        interval,
        intervalDays,
        nextBillingDate,
        cardId,
      }),
    )

    const cardLine =
      cardId === null
        ? 'Без карты'
        : (userCards.find(c => c.id === cardId)?.label ?? '—')

    await cardCb.reply(
      `✅ Добавлено:\n\n` +
        `«${name}» — ${amount.toFixed(2)} ${currency} / ${humanInterval(interval, intervalDays)}\n` +
        `Следующее списание: ${nextBillingDate}\n` +
        `Карта: ${cardLine}`,
      { reply_markup: doneKeyboard() },
    )
  }
}
